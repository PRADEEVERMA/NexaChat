import toast from "react-hot-toast";
import { create } from "zustand";
import { callApi } from "../api/callApi.js";
import { showAppNotification } from "../utils/pwa.js";

const turnServer =
  import.meta.env.VITE_TURN_URL &&
  import.meta.env.VITE_TURN_USERNAME &&
  import.meta.env.VITE_TURN_CREDENTIAL
    ? {
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL
      }
    : null;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(turnServer ? [turnServer] : [])
  ],
  iceCandidatePoolSize: 10
};

const logPeerState = (peer, label) => {
  console.log(label, {
    connectionState: peer.connectionState,
    iceState: peer.iceConnectionState,
    signalingState: peer.signalingState
  });
};

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
        if (!gain || !context) return;
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
      oscillator?.stop();
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

const getUserMediaWithFallback = async (type) => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Media devices are not available in this browser");
  }

  const constraints =
    type === "video"
      ? [
          {
            audio: true,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { ideal: "user" }
            }
          },
          { audio: true, video: true }
        ]
      : [{ audio: true, video: false }];

  let lastError;

  for (const constraint of constraints) {
    try {
      console.log("getUserMedia requested", constraint);
      const stream = await navigator.mediaDevices.getUserMedia(constraint);
      console.log("getUserMedia resolved", {
        audioTracks: stream.getAudioTracks().map((track) => ({ id: track.id, enabled: track.enabled, readyState: track.readyState })),
        videoTracks: stream.getVideoTracks().map((track) => ({ id: track.id, enabled: track.enabled, readyState: track.readyState }))
      });

      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Microphone track was not granted");
      }

      if (type === "video" && !stream.getVideoTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Camera track was not granted");
      }

      return stream;
    } catch (error) {
      lastError = error;
      console.error("getUserMedia attempt failed", error, constraint);
    }
  }

  throw lastError || new Error("Media capture failed");
};

const createPeer = ({ socket, receiverId, getCallId, onRemoteStream, onConnected }) => {
  const peer = new RTCPeerConnection(rtcConfig);

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("ICE Sent", event.candidate);
      socket.emit("ice-candidate", { receiverId, callId: getCallId?.(), candidate: event.candidate });
    }
  };

  peer.ontrack = (event) => {
    console.log("Track Received", {
      trackId: event.track?.id,
      kind: event.track?.kind,
      streams: event.streams?.map((stream) => stream.id)
    });

    const [remoteStream] = event.streams || [];
    if (remoteStream) {
      onRemoteStream(remoteStream);
      return;
    }

    const fallbackStream = new MediaStream([event.track]);
    onRemoteStream(fallbackStream);
  };

  const markConnected = () => {
    logPeerState(peer, "Connection State");
    if (peer.connectionState === "connected" || peer.iceConnectionState === "connected") {
      console.log("Call Connected");
      onConnected();
    }
  };

  peer.onconnectionstatechange = markConnected;
  peer.oniceconnectionstatechange = markConnected;
  peer.onsignalingstatechange = () => logPeerState(peer, "Signaling State");
  peer.onicegatheringstatechange = () => console.log("ICE Gathering State", peer.iceGatheringState);

  return peer;
};

const addPendingCandidates = async (peer, candidates = []) => {
  if (!peer?.remoteDescription) return;

  for (const candidate of candidates) {
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("ICE add failed", error, candidate);
    }
  }
};

const addLocalTracks = (peer, stream) => {
  stream.getTracks().forEach((track) => {
    console.log("Adding local track", { kind: track.kind, id: track.id, enabled: track.enabled });
    peer.addTrack(track, stream);
  });
};

export const useCallStore = create((set, get) => ({
  call: null,
  localStream: null,
  remoteStream: null,
  peer: null,
  pendingCandidates: [],
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
    if (!socket) return;

    socket.off("incoming-call");
    socket.off("call-answered");
    socket.off("call-ringing");
    socket.off("ice-candidate");
    socket.off("reject-call");
    socket.off("call-ended");
    socket.off("call-timeout");
    socket.off("missed-call");

    socket.on("incoming-call", ({ callId, caller, offer, callType }) => {
      console.log("Offer Received");
      stopSounds();
      incomingTone.start();
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
        },
        pendingCandidates: []
      });
    });

    socket.on("call-ringing", ({ callId }) => {
      set((state) => ({
        call: state.call ? { ...state.call, id: callId, status: "calling" } : null
      }));
    });

    socket.on("call-answered", async ({ answer, callId }) => {
      console.log("Answer Received");
      stopSounds();
      const { peer } = get();
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
        logPeerState(peer, "Remote Answer Set");
        await addPendingCandidates(peer, get().pendingCandidates);
      }
      set((state) => ({
        call: state.call ? { ...state.call, id: callId || state.call.id, status: "connected" } : null,
        pendingCandidates: []
      }));
      get().loadCallHistory();
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      console.log("ICE Received", candidate);
      const { peer } = get();
      if (!candidate) return;

      if (!peer) {
        set({ pendingCandidates: [...get().pendingCandidates, candidate] });
        return;
      }

      if (!peer.remoteDescription) {
        set({ pendingCandidates: [...get().pendingCandidates, candidate] });
        return;
      }

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("ICE add failed", error, candidate);
      }
    });

    socket.on("reject-call", () => {
      stopSounds();
      get().endLocalCall();
      get().loadCallHistory();
      toast("Call declined");
    });

    socket.on("call-ended", () => {
      stopSounds();
      get().endLocalCall();
      get().loadCallHistory();
      toast("Call ended");
    });

    socket.on("call-timeout", () => {
      stopSounds();
      get().endLocalCall();
      get().loadCallHistory();
      toast("Missed Call");
    });

    socket.on("missed-call", () => {
      stopSounds();
      get().endLocalCall();
      get().loadCallHistory();
      toast("Missed Call");
    });
  },

  startCall: async ({ socket, user, type }) => {
    if (!socket || !user?._id) return;

    try {
      const localStream = await getUserMediaWithFallback(type);
      const peer = createPeer({
        socket,
        receiverId: user._id,
        getCallId: () => get().call?.id,
        onRemoteStream: (remoteStream) => set({ remoteStream }),
        onConnected: () => set((state) => ({ call: state.call ? { ...state.call, status: "connected" } : null }))
      });

      addLocalTracks(peer, localStream);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.log("Offer Created");
      logPeerState(peer, "Local Offer Set");

      stopSounds();
      outgoingTone.start();
      set({
        peer,
        localStream,
        remoteStream: null,
        isMuted: false,
        isCameraOff: false,
        call: { status: "calling", direction: "outgoing", user, type }
      });
      socket.emit("call-user", { receiverId: user._id, offer, callType: type }, (response) => {
        if (!response?.success) {
          stopSounds();
          get().endLocalCall();
          toast.error(response?.message || "Could not start call");
          return;
        }

        set((state) => ({
          call: state.call ? { ...state.call, id: response.callId } : null
        }));
      });
    } catch (error) {
      console.error("Start call failed", error);
      stopSounds();
      toast.error("Could not start call");
    }
  },

  acceptCall: async (socket) => {
    const { call } = get();
    if (!socket || !call?.offer || !call?.user?._id) return;

    let stage = "initializing";
    let localStream;
    let peer;

    try {
      console.log("Accept call clicked", {
        callId: call.id,
        callerId: call.user._id,
        callType: call.type,
        offerType: call.offer?.type,
        hasOfferSdp: Boolean(call.offer?.sdp)
      });
      stopSounds();
      stage = "getUserMedia";
      localStream = await getUserMediaWithFallback(call.type);

      stage = "createPeerConnection";
      peer = createPeer({
        socket,
        receiverId: call.user._id,
        getCallId: () => get().call?.id || call.id,
        onRemoteStream: (remoteStream) => set({ remoteStream }),
        onConnected: () => set((state) => ({ call: state.call ? { ...state.call, status: "connected" } : null }))
      });

      set({ peer, localStream, remoteStream: null, isMuted: false, isCameraOff: false });
      stage = "addLocalTracks";
      addLocalTracks(peer, localStream);

      stage = "setRemoteDescription";
      await peer.setRemoteDescription(new RTCSessionDescription(call.offer));
      logPeerState(peer, "Remote Offer Set");

      stage = "createAnswer";
      const answer = await peer.createAnswer();

      stage = "setLocalDescription";
      await peer.setLocalDescription(answer);
      console.log("Answer Created");
      logPeerState(peer, "Local Answer Set");

      stage = "emitAcceptCall";
      socket.emit("accept-call", { receiverId: call.user._id, answer, callId: call.id });

      stage = "addPendingCandidates";
      await addPendingCandidates(peer, get().pendingCandidates);

      set({
        peer,
        localStream,
        pendingCandidates: [],
        isMuted: false,
        isCameraOff: false,
        call: { ...call, status: "connected" }
      });
      get().loadCallHistory();
    } catch (error) {
      console.error(`Answer call failed at stage: ${stage}`, error);
      peer?.close();
      localStream?.getTracks().forEach((track) => track.stop());
      set({ peer: null, localStream: null, remoteStream: null });
      stopSounds();
      toast.error(`Could not answer call: ${error.message || "Unknown error"}`);
    }
  },

  rejectCall: (socket) => {
    const { call } = get();
    if (socket && call?.user?._id) {
      socket.emit("reject-call", { receiverId: call.user._id, callId: call.id });
    }
    stopSounds();
    get().endLocalCall();
    get().loadCallHistory();
  },

  endCall: (socket) => {
    const { call } = get();
    if (socket && call?.user?._id) {
      socket.emit("call-ended", { receiverId: call.user._id, callId: call.id });
    }
    stopSounds();
    get().endLocalCall();
    get().loadCallHistory();
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });
    set({ isMuted: !isMuted });
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get();
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = isCameraOff;
    });
    set({ isCameraOff: !isCameraOff });
  },

  endLocalCall: () => {
    const { peer, localStream } = get();
    peer?.close();
    localStream?.getTracks().forEach((track) => track.stop());
    set({
      call: null,
      localStream: null,
      remoteStream: null,
      peer: null,
      pendingCandidates: [],
      isMuted: false,
      isCameraOff: false
    });
  }
}));
