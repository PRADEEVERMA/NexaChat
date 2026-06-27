import toast from "react-hot-toast";
import { create } from "zustand";
import { callApi } from "../api/callApi.js";
import { showAppNotification } from "../utils/pwa.js";

const subscriptions = new WeakMap();

const turnServer =
  import.meta.env.VITE_TURN_URL &&
  import.meta.env.VITE_TURN_USERNAME &&
  import.meta.env.VITE_TURN_CREDENTIAL
    ? {
        urls: import.meta.env.VITE_TURN_URL.split(",").map((url) => url.trim()),
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL
      }
    : null;

const rtcConfig = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ...(turnServer ? [turnServer] : [])
  ],
  iceCandidatePoolSize: 10
};

let activePeer = null;
let activeLocalStream = null;
let activeRemoteStream = null;
let mediaRequest = null;
let pendingRemoteCandidates = [];
let pendingLocalCandidates = [];
let activeSocket = null;
let activeRemoteUserId = null;
let activeCallId = null;

const createTone = ({ high = false } = {}) => {
  let context;
  let oscillator;
  let gain;
  let interval;

  return {
    start: () => {
      if (context) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      context = new AudioContext();
      oscillator = context.createOscillator();
      gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = high ? 880 : 520;
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();

      const pulse = () => {
        if (!context || !gain) return;
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.11, now + 0.04);
        gain.gain.linearRampToValueAtTime(0, now + 0.45);
      };

      pulse();
      interval = window.setInterval(pulse, high ? 900 : 1400);
    },
    stop: () => {
      if (interval) window.clearInterval(interval);
      interval = null;
      try {
        oscillator?.stop();
      } catch {
        // The oscillator may already be stopped.
      }
      context?.close();
      context = null;
      oscillator = null;
      gain = null;
    }
  };
};

const incomingTone = createTone({ high: true });
const outgoingTone = createTone();

const stopSounds = () => {
  incomingTone.stop();
  outgoingTone.stop();
};

const logPeerState = (peer, label) => {
  console.log(`[WebRTC] ${label}`, {
    signalingState: peer.signalingState,
    connectionState: peer.connectionState,
    iceConnectionState: peer.iceConnectionState,
    iceGatheringState: peer.iceGatheringState
  });
};

const acquireLocalStream = async (type) => {
  if (activeLocalStream?.active) return activeLocalStream;
  if (mediaRequest) return mediaRequest;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera and microphone require a secure, supported browser");
  }

  const attempts =
    type === "video"
      ? [
          {
            audio: { echoCancellation: true, noiseSuppression: true },
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          { audio: true, video: true }
        ]
      : [{ audio: { echoCancellation: true, noiseSuppression: true }, video: false }];

  mediaRequest = (async () => {
    let lastError;

    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();

        if (!audioTracks.length || (type === "video" && !videoTracks.length)) {
          stream.getTracks().forEach((track) => track.stop());
          throw new Error("Required camera or microphone track was not granted");
        }

        activeLocalStream = stream;
        console.log("[WebRTC] Local stream created", {
          streamId: stream.id,
          audioTracks: audioTracks.map((track) => track.id),
          videoTracks: videoTracks.map((track) => track.id)
        });
        return stream;
      } catch (error) {
        lastError = error;
        console.error("[WebRTC] Media request failed", error);
      }
    }

    throw lastError || new Error("Could not access camera or microphone");
  })();

  try {
    return await mediaRequest;
  } finally {
    mediaRequest = null;
  }
};

const addLocalTracks = (peer, stream) => {
  const senderTrackIds = new Set(
    peer
      .getSenders()
      .map((sender) => sender.track?.id)
      .filter(Boolean)
  );

  stream.getTracks().forEach((track) => {
    if (senderTrackIds.has(track.id)) return;
    peer.addTrack(track, stream);
    console.log("[WebRTC] Track added", {
      kind: track.kind,
      trackId: track.id,
      streamId: stream.id
    });
  });
};

const flushLocalCandidates = () => {
  if (!activeSocket || !activeRemoteUserId || !activeCallId) return;

  pendingLocalCandidates.forEach((candidate) => {
    console.log("[WebRTC] ICE sent", {
      callId: activeCallId,
      candidate: candidate.candidate
    });
    activeSocket.emit("ice-candidate", {
      receiverId: activeRemoteUserId,
      callId: activeCallId,
      candidate
    });
  });
  pendingLocalCandidates = [];
};

const addRemoteCandidate = async (peer, candidate) => {
  try {
    await peer.addIceCandidate(candidate);
    console.log("[WebRTC] ICE candidate added", {
      candidate: candidate.candidate
    });
  } catch (error) {
    console.error("[WebRTC] ICE candidate rejected", error, candidate);
  }
};

const flushRemoteCandidates = async () => {
  if (!activePeer?.remoteDescription) return;
  const candidates = pendingRemoteCandidates;
  pendingRemoteCandidates = [];

  for (const candidate of candidates) {
    await addRemoteCandidate(activePeer, candidate);
  }
};

const createPeerConnection = ({ socket, receiverId, set }) => {
  if (activePeer && activePeer.signalingState !== "closed") return activePeer;

  activeSocket = socket;
  activeRemoteUserId = receiverId;
  activeRemoteStream = new MediaStream();
  const peer = new RTCPeerConnection(rtcConfig);
  activePeer = peer;

  set({ peer, remoteStream: activeRemoteStream });

  peer.onicecandidate = ({ candidate }) => {
    if (!candidate) {
      console.log("[WebRTC] ICE gathering complete");
      return;
    }

    const plainCandidate = candidate.toJSON();
    if (!activeCallId) {
      pendingLocalCandidates.push(plainCandidate);
      return;
    }

    console.log("[WebRTC] ICE sent", {
      callId: activeCallId,
      candidate: plainCandidate.candidate
    });
    socket.emit("ice-candidate", {
      receiverId,
      callId: activeCallId,
      candidate: plainCandidate
    });
  };

  peer.ontrack = (event) => {
    console.log("[WebRTC] ontrack fired", {
      kind: event.track.kind,
      trackId: event.track.id,
      streamIds: event.streams.map((stream) => stream.id)
    });

    const tracks = event.streams.length
      ? event.streams.flatMap((stream) => stream.getTracks())
      : [event.track];

    tracks.forEach((track) => {
      if (
        !activeRemoteStream
          .getTracks()
          .some((existingTrack) => existingTrack.id === track.id)
      ) {
        activeRemoteStream.addTrack(track);
      }
    });

    set({ remoteStream: activeRemoteStream });
    console.log("[WebRTC] Remote stream updated", {
      streamId: activeRemoteStream.id,
      audioTracks: activeRemoteStream.getAudioTracks().length,
      videoTracks: activeRemoteStream.getVideoTracks().length
    });
  };

  peer.onconnectionstatechange = () => {
    logPeerState(peer, "Connection state changed");
    if (peer.connectionState === "connected") {
      set((state) => ({
        call: state.call ? { ...state.call, status: "connected" } : null
      }));
    }
    if (peer.connectionState === "failed") {
      toast.error(
        turnServer
          ? "Call connection failed"
          : "Call connection failed. Configure a TURN server for restrictive networks."
      );
    }
  };

  peer.oniceconnectionstatechange = () => {
    logPeerState(peer, "ICE state changed");
    if (peer.iceConnectionState === "failed") {
      peer.restartIce();
    }
  };

  peer.onsignalingstatechange = () => logPeerState(peer, "Signaling state changed");
  return peer;
};

const releaseCallResources = () => {
  stopSounds();

  if (activePeer) {
    activePeer.onicecandidate = null;
    activePeer.ontrack = null;
    activePeer.onconnectionstatechange = null;
    activePeer.oniceconnectionstatechange = null;
    activePeer.onsignalingstatechange = null;
    activePeer.close();
  }

  activeLocalStream?.getTracks().forEach((track) => track.stop());
  activeRemoteStream?.getTracks().forEach((track) => track.stop());
  activePeer = null;
  activeLocalStream = null;
  activeRemoteStream = null;
  mediaRequest = null;
  pendingRemoteCandidates = [];
  pendingLocalCandidates = [];
  activeSocket = null;
  activeRemoteUserId = null;
  activeCallId = null;
};

const describeMediaError = (error) => {
  if (error?.name === "NotAllowedError") {
    return "Camera or microphone permission was denied";
  }
  if (error?.name === "NotFoundError") {
    return "No camera or microphone was found";
  }
  if (error?.name === "NotReadableError") {
    return "Camera or microphone is already in use";
  }
  return error?.message || "Could not access camera or microphone";
};

export const useCallStore = create((set, get) => ({
  call: null,
  localStream: null,
  remoteStream: null,
  peer: null,
  callHistory: [],
  isMuted: false,
  isCameraOff: false,

  loadCallHistory: async () => {
    try {
      const { data } = await callApi.getHistory();
      set({ callHistory: data.calls });
    } catch {
      set({ callHistory: [] });
    }
  },

  subscribeToCalls: (socket) => {
    if (!socket) return () => {};
    subscriptions.get(socket)?.();

    const handleIncomingCall = ({ callId, caller, offer, callType }) => {
      console.log("[WebRTC] Offer received", { callId, callerId: caller?._id });

      if (get().call || activePeer) {
        socket.emit("reject-call", {
          receiverId: caller?._id,
          callId,
          reason: "busy"
        });
        return;
      }

      stopSounds();
      incomingTone.start();
      activeCallId = callId;
      activeSocket = socket;
      activeRemoteUserId = caller?._id;
      pendingRemoteCandidates = [];
      pendingLocalCandidates = [];

      if (document.visibilityState === "hidden") {
        showAppNotification({
          title: `${caller?.name || "Someone"} is calling`,
          body: `Incoming ${callType} call`,
          tag: `call-${callId}`
        });
      }

      set({
        call: {
          id: callId,
          status: "ringing",
          direction: "incoming",
          user: caller,
          offer,
          type: callType
        }
      });
    };

    const handleCallRinging = ({ callId }) => {
      activeCallId = callId;
      flushLocalCandidates();
      set((state) => ({
        call: state.call
          ? { ...state.call, id: callId, status: "calling" }
          : null
      }));
    };

    const handleCallAnswered = async ({ answer, callId }) => {
      if (!activePeer || !answer) return;
      if (activeCallId && callId && callId !== activeCallId) return;

      try {
        console.log("[WebRTC] Answer received", { callId });
        stopSounds();
        await activePeer.setRemoteDescription(answer);
        console.log("[WebRTC] Remote answer set");
        await flushRemoteCandidates();
        set((state) => ({
          call: state.call
            ? {
                ...state.call,
                id: callId || state.call.id,
                status: "connecting"
              }
            : null
        }));
        get().loadCallHistory();
      } catch (error) {
        console.error("[WebRTC] Could not apply answer", error);
        toast.error("Could not complete call negotiation");
        get().endLocalCall();
      }
    };

    const handleIceCandidate = async ({ candidate, callId }) => {
      if (!candidate) return;
      if (activeCallId && callId && callId !== activeCallId) return;

      console.log("[WebRTC] ICE received", {
        callId,
        candidate: candidate.candidate
      });

      if (!activePeer?.remoteDescription) {
        pendingRemoteCandidates.push(candidate);
        return;
      }

      await addRemoteCandidate(activePeer, candidate);
    };

    const finishRemoteCall = (message) => {
      get().endLocalCall();
      get().loadCallHistory();
      toast(message);
    };

    const handleRejected = ({ callId } = {}) => {
      if (activeCallId && callId && callId !== activeCallId) return;
      finishRemoteCall("Call declined");
    };
    const handleEnded = ({ callId } = {}) => {
      if (activeCallId && callId && callId !== activeCallId) return;
      finishRemoteCall("Call ended");
    };
    const handleTimeout = ({ callId } = {}) => {
      if (activeCallId && callId && callId !== activeCallId) return;
      finishRemoteCall("Missed call");
    };

    const listeners = [
      ["incoming-call", handleIncomingCall],
      ["call-ringing", handleCallRinging],
      ["call-answered", handleCallAnswered],
      ["ice-candidate", handleIceCandidate],
      ["reject-call", handleRejected],
      ["call-ended", handleEnded],
      ["call-timeout", handleTimeout],
      ["missed-call", handleTimeout]
    ];

    listeners.forEach(([event, handler]) => socket.on(event, handler));

    const unsubscribe = () => {
      listeners.forEach(([event, handler]) => socket.off(event, handler));
      if (subscriptions.get(socket) === unsubscribe) subscriptions.delete(socket);
    };

    subscriptions.set(socket, unsubscribe);
    return unsubscribe;
  },

  startCall: async ({ socket, user, type }) => {
    if (!socket?.connected || !user?._id || get().call || activePeer) return;

    try {
      activeSocket = socket;
      activeRemoteUserId = user._id;
      activeCallId = null;
      pendingLocalCandidates = [];
      pendingRemoteCandidates = [];

      const localStream = await acquireLocalStream(type);
      const peer = createPeerConnection({
        socket,
        receiverId: user._id,
        set
      });
      addLocalTracks(peer, localStream);
      set({
        peer,
        localStream,
        remoteStream: activeRemoteStream,
        isMuted: false,
        isCameraOff: false,
        call: { status: "calling", direction: "outgoing", user, type }
      });

      const offer = await peer.createOffer();
      console.log("[WebRTC] Offer created");
      await peer.setLocalDescription(offer);
      console.log("[WebRTC] Local offer set");

      stopSounds();
      outgoingTone.start();
      socket.emit(
        "call-user",
        {
          receiverId: user._id,
          offer: peer.localDescription,
          callType: type
        },
        (response) => {
          if (!response?.success) {
            get().endLocalCall();
            toast.error(response?.message || "Could not start call");
            return;
          }

          activeCallId = response.callId;
          flushLocalCandidates();
          set((state) => ({
            call: state.call
              ? { ...state.call, id: response.callId, status: "calling" }
              : null
          }));
        }
      );
    } catch (error) {
      console.error("[WebRTC] Start call failed", error);
      get().endLocalCall();
      toast.error(describeMediaError(error));
    }
  },

  acceptCall: async (socket) => {
    const call = get().call;
    if (
      !socket?.connected ||
      !call?.offer ||
      !call?.user?._id ||
      call.status !== "ringing"
    ) {
      return;
    }

    try {
      stopSounds();
      activeSocket = socket;
      activeRemoteUserId = call.user._id;
      activeCallId = call.id;

      const localStream = await acquireLocalStream(call.type);
      const peer = createPeerConnection({
        socket,
        receiverId: call.user._id,
        set
      });
      addLocalTracks(peer, localStream);
      set({
        peer,
        localStream,
        remoteStream: activeRemoteStream,
        isMuted: false,
        isCameraOff: false,
        call: { ...call, status: "connecting" }
      });

      await peer.setRemoteDescription(call.offer);
      console.log("[WebRTC] Remote offer set");
      await flushRemoteCandidates();

      const answer = await peer.createAnswer();
      console.log("[WebRTC] Answer created");
      await peer.setLocalDescription(answer);
      console.log("[WebRTC] Local answer set");

      socket.emit("accept-call", {
        receiverId: call.user._id,
        answer: peer.localDescription,
        callId: call.id
      });
      flushLocalCandidates();
      get().loadCallHistory();
    } catch (error) {
      console.error("[WebRTC] Answer call failed", error);
      get().endLocalCall();
      toast.error(describeMediaError(error));
    }
  },

  rejectCall: (socket) => {
    const call = get().call;
    if (socket?.connected && call?.user?._id) {
      socket.emit("reject-call", {
        receiverId: call.user._id,
        callId: call.id
      });
    }
    get().endLocalCall();
    get().loadCallHistory();
  },

  endCall: (socket) => {
    const call = get().call;
    if (socket?.connected && call?.user?._id) {
      socket.emit("call-ended", {
        receiverId: call.user._id,
        callId: call.id
      });
    }
    get().endLocalCall();
    get().loadCallHistory();
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    activeLocalStream?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    set({ isMuted: nextMuted });
  },

  toggleCamera: () => {
    const nextCameraOff = !get().isCameraOff;
    activeLocalStream?.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    set({ isCameraOff: nextCameraOff });
  },

  endLocalCall: () => {
    releaseCallResources();
    set({
      call: null,
      localStream: null,
      remoteStream: null,
      peer: null,
      isMuted: false,
      isCameraOff: false
    });
  }
}));
