import { Camera, RefreshCcw, RotateCcw, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Button from "./Button.jsx";

const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const CameraCaptureModal = ({ open, onClose, onSend }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [previewUrl, setPreviewUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const startCamera = async () => {
      setIsStarting(true);
      stopStream(streamRef.current);
      streamRef.current = null;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        if (cancelled) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error("Camera capture failed", error);
        toast.error("Could not open camera");
        onClose();
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [facingMode, onClose, open]);

  useEffect(() => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setPhotoFile(null);
      setIsSending(false);
    }
  }, [open, previewUrl]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPhotoFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92
    );
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPhotoFile(null);
  };

  const switchCamera = () => {
    if (previewUrl) return;
    setFacingMode((value) => (value === "environment" ? "user" : "environment"));
  };

  const sendPhoto = async () => {
    if (!photoFile) return;
    setIsSending(true);
    const sent = await onSend(photoFile);
    setIsSending(false);
    if (sent) onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/85 p-3 backdrop-blur-sm">
      <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 p-3">
          <div className="flex items-center gap-2 font-semibold">
            <Camera size={18} />
            Camera
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Close camera"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="relative bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`max-h-[65vh] min-h-[320px] w-full bg-black object-contain ${previewUrl ? "hidden" : "block"}`}
          />
          {previewUrl && <img src={previewUrl} alt="Captured preview" className="max-h-[65vh] w-full object-contain" />}
          {isStarting && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-semibold text-slate-100">
              Opening camera
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <footer className="flex items-center justify-center gap-3 border-t border-white/10 p-3">
          {previewUrl ? (
            <>
              <Button type="button" variant="ghost" onClick={retake}>
                <RotateCcw size={17} />
                Retake
              </Button>
              <Button type="button" loading={isSending} onClick={sendPhoto}>
                <Send size={17} />
                Send
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" className="h-12 w-12 rounded-full px-0" title="Switch camera" onClick={switchCamera}>
                <RefreshCcw size={18} />
              </Button>
              <Button type="button" className="h-14 w-14 rounded-full px-0" title="Capture photo" onClick={capturePhoto} disabled={isStarting}>
                <Camera size={22} />
              </Button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
};

export default CameraCaptureModal;
