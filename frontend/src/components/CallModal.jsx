import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";
import Avatar from "./Avatar.jsx";
import Button from "./Button.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { useCallStore } from "../store/useCallStore.js";

const CallModal = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { socket } = useAuthStore();
  const {
    call,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera
  } = useCallStore();

  useEffect(() => {
    if (!localVideoRef.current || !localStream) return;

    localVideoRef.current.srcObject = localStream;
    localVideoRef.current
      .play()
      .then(() => console.log("Local Video Playing"))
      .catch((error) => console.error("Local video play failed", error));
  }, [localStream]);

  useEffect(() => {
    if (!remoteVideoRef.current || !remoteStream) return;

    remoteVideoRef.current.srcObject = remoteStream;
    console.log("Remote Stream Attached", {
      streamId: remoteStream.id,
      videoTracks: remoteStream.getVideoTracks().length,
      audioTracks: remoteStream.getAudioTracks().length
    });

    remoteVideoRef.current
      .play()
      .then(() => console.log("Video Playing"))
      .catch((error) => console.error("Remote video play failed", error));
  }, [remoteStream]);

  if (!call) return null;

  const isVideo = call.type === "video";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-slate-900 p-5 text-center shadow-2xl">
        <div className="mx-auto w-fit">
          <Avatar user={call.user} size="lg" online />
        </div>
        <h2 className="mt-4 text-xl font-bold">{call.user?.name}</h2>
        <p className="mt-1 text-sm text-slate-400">
          {call.status === "ringing" ? `Incoming ${call.type} call` : call.status === "calling" ? "Calling..." : "Connected"}
        </p>

        {isVideo && (
          <div className="mt-5 grid gap-3">
            <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video w-full rounded-lg bg-slate-950 object-cover" />
            <video ref={localVideoRef} autoPlay muted playsInline className="ml-auto aspect-video w-32 rounded-lg bg-slate-950 object-cover" />
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          {call.status === "ringing" && (
            <Button type="button" className="h-12 w-12 rounded-full px-0" title="Accept" onClick={() => acceptCall(socket)}>
              {isVideo ? <Video size={20} /> : <Phone size={20} />}
            </Button>
          )}
          {call.status === "connected" && (
            <>
              <Button type="button" variant="ghost" className="h-12 w-12 rounded-full px-0" title={isMuted ? "Unmute" : "Mute"} onClick={toggleMute}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </Button>
              {isVideo && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 w-12 rounded-full px-0"
                  title={isCameraOff ? "Camera on" : "Camera off"}
                  onClick={toggleCamera}
                >
                  {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                </Button>
              )}
            </>
          )}
          <Button
            type="button"
            variant="danger"
            className="h-12 w-12 rounded-full px-0"
            title={call.status === "ringing" ? "Reject" : "End call"}
            onClick={() => (call.status === "ringing" ? rejectCall(socket) : endCall(socket))}
          >
            <PhoneOff size={20} />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default CallModal;
