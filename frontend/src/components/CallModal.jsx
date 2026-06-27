import { Mic, MicOff, Phone, PhoneOff, Volume2, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";
import Avatar from "./Avatar.jsx";
import Button from "./Button.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { useCallStore } from "../store/useCallStore.js";

const attachStream = async (video, stream, label) => {
  if (!video || !stream) return;
  if (video.srcObject !== stream) video.srcObject = stream;

  console.log(`[WebRTC] ${label} stream attached`, {
    streamId: stream.id,
    active: stream.active,
    audioTracks: stream.getAudioTracks().length,
    videoTracks: stream.getVideoTracks().length
  });

  try {
    await video.play();
    console.log(`[WebRTC] ${label} video playing`);
  } catch (error) {
    console.warn(`[WebRTC] ${label} autoplay waiting for user interaction`, error);
  }
};

const clearVideo = (video) => {
  if (!video) return;
  video.pause();
  video.srcObject = null;
};

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
    endLocalCall,
    toggleMute,
    toggleCamera
  } = useCallStore();

  useEffect(() => () => endLocalCall(), [endLocalCall]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (video && localStream) attachStream(video, localStream, "Local");
    return () => clearVideo(video);
  }, [call?.type, localStream]);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (video && remoteStream) attachStream(video, remoteStream, "Remote");
    return () => clearVideo(video);
  }, [call?.type, remoteStream]);

  if (!call) return null;

  const isVideo = call.type === "video";
  const statusText = {
    ringing: `Incoming ${call.type} call`,
    calling: "Calling...",
    connecting: "Connecting...",
    connected: "Connected"
  }[call.status];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950 text-center">
      <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
        {isVideo ? (
          <div className="absolute inset-0 bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              controls={false}
              onLoadedMetadata={(event) => event.currentTarget.play().catch(() => {})}
              className="h-full w-full bg-black object-cover"
            />
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              controls={false}
              onLoadedMetadata={(event) => event.currentTarget.play().catch(() => {})}
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] aspect-[9/16] w-24 rounded-lg border border-white/20 bg-slate-950 object-cover shadow-2xl sm:w-32"
            />
          </div>
        ) : (
          <>
            <audio
              ref={remoteVideoRef}
              autoPlay
              onLoadedMetadata={(event) => event.currentTarget.play().catch(() => {})}
            />
            <div className="absolute inset-0 grid place-items-center bg-slate-950">
              <div>
                <div className="mx-auto w-fit">
                  <Avatar user={call.user} size="lg" online />
                </div>
                <h2 className="mt-4 text-xl font-bold">{call.user?.name}</h2>
              </div>
            </div>
          </>
        )}

        <div className="relative z-10 bg-gradient-to-b from-black/65 to-transparent px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2 className="truncate text-lg font-bold">{call.user?.name}</h2>
          <p className="mt-1 text-sm text-slate-300">{statusText}</p>
        </div>

        <div className="relative z-10 mt-auto flex justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12">
          {call.status === "ringing" && (
            <Button
              type="button"
              className="h-12 w-12 rounded-full px-0"
              title="Accept"
              onClick={() => acceptCall(socket)}
            >
              {isVideo ? <Video size={20} /> : <Phone size={20} />}
            </Button>
          )}

          {["connecting", "connected"].includes(call.status) && (
            <>
              <Button
                type="button"
                variant="ghost"
                className="h-12 w-12 rounded-full px-0"
                title={isMuted ? "Unmute" : "Mute"}
                onClick={toggleMute}
              >
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
              <Button
                type="button"
                variant="ghost"
                className="h-12 w-12 rounded-full px-0"
                title="Speaker"
              >
                <Volume2 size={20} />
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="danger"
            className="h-12 w-12 rounded-full px-0"
            title={call.status === "ringing" ? "Reject" : "End call"}
            onClick={() =>
              call.status === "ringing" ? rejectCall(socket) : endCall(socket)
            }
          >
            <PhoneOff size={20} />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default CallModal;
