import { Mic, MicOff, Phone, PhoneOff, Volume2, Video, VideoOff } from "lucide-react";
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950 text-center">
      <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
        {isVideo ? (
          <div className="absolute inset-0 bg-black">
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full bg-black object-cover" />
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] aspect-[9/16] w-24 rounded-lg border border-white/20 bg-slate-950 object-cover shadow-2xl sm:w-32"
            />
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-slate-950">
            <div>
              <div className="mx-auto w-fit">
                <Avatar user={call.user} size="lg" online />
              </div>
              <h2 className="mt-4 text-xl font-bold">{call.user?.name}</h2>
            </div>
          </div>
        )}

        <div className="relative z-10 bg-gradient-to-b from-black/65 to-transparent px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2 className="truncate text-lg font-bold">{call.user?.name}</h2>
          <p className="mt-1 text-sm text-slate-300">
            {call.status === "ringing" ? `Incoming ${call.type} call` : call.status === "calling" ? "Calling..." : "Connected"}
          </p>
        </div>

        <div className="relative z-10 mt-auto flex justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12">
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
              <Button type="button" variant="ghost" className="h-12 w-12 rounded-full px-0" title="Speaker">
                <Volume2 size={20} />
              </Button>
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
