import { Camera, ImagePlus, Mic, Send, Smile, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button.jsx";
import CameraCaptureModal from "./CameraCaptureModal.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";

const emojis = ["😀", "😂", "😍", "🥰", "👍", "🙏", "🔥", "🎉", "💙", "✅", "😎", "😭"];

const MessageInput = ({ receiverId }) => {
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const { socket } = useAuthStore();
  const { sendMessage } = useChatStore();

  const emitTyping = () => {
    if (!socket?.connected || !receiverId) return;
    socket.emit("typing", { receiverId });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", { receiverId });
    }, 900);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;

    setText("");
    socket?.emit("stop-typing", { receiverId });
    await sendMessage(receiverId, value, socket);
  };

  const sendFiles = async (files) => {
    if (!files?.length) return;

    const formData = new FormData();
    formData.append("text", text.trim());
    Array.from(files).forEach((file) => formData.append("attachments", file));
    setText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await sendMessage(receiverId, formData, socket);
  };

  const closeCamera = useCallback(() => {
    setCameraOpen(false);
  }, []);

  const sendCameraPhoto = useCallback(async (file) => {
    const formData = new FormData();
    formData.append("attachments", file);
    return sendMessage(receiverId, formData, socket);
  }, [receiverId, sendMessage, socket]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("attachments", file);
      await sendMessage(receiverId, formData, socket);
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative flex items-end gap-2 border-t border-white/10 p-3 sm:p-4">
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-14 grid grid-cols-6 gap-2 rounded-lg border border-white/10 bg-slate-950/95 p-3 shadow-xl">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg text-xl transition hover:bg-white/10"
              onClick={() => setText((value) => `${value}${emoji}`)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.docx,.zip"
        onChange={(event) => sendFiles(event.target.files)}
      />
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-11 px-0"
        title="Add media"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus size={18} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-11 px-0"
        title="Open camera"
        onClick={() => setCameraOpen(true)}
      >
        <Camera size={18} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-11 px-0"
        title="Emoji"
        onClick={() => setShowEmojiPicker((value) => !value)}
      >
        <Smile size={18} />
      </Button>
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          emitTyping();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
          }
        }}
        rows={1}
        placeholder="Message"
        className="max-h-36 min-h-11 flex-1 resize-none rounded-lg border border-slate-700/70 bg-slate-950/55 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-300/70 focus:ring-4 focus:ring-teal-300/10"
      />
      <Button
        type="button"
        variant={isRecording ? "primary" : "ghost"}
        className="h-11 w-11 px-0"
        title={isRecording ? "Stop recording" : "Record voice"}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? <Square size={16} /> : <Mic size={18} />}
      </Button>
      <Button type="submit" className="h-11 w-11 px-0" title="Send message">
        <Send size={18} />
      </Button>
      <CameraCaptureModal open={cameraOpen} onClose={closeCamera} onSend={sendCameraPhoto} />
    </form>
  );
};

export default MessageInput;
