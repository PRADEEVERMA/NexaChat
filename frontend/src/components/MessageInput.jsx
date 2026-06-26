import { Camera, ImagePlus, Mic, Send, Smile, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button.jsx";
import CameraCaptureModal from "./CameraCaptureModal.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";
import { useSocialStore } from "../store/useSocialStore.js";

const emojis = ["😀", "😂", "😍", "🥰", "👍", "🙏", "🔥", "🎉", "💙", "✅", "😎", "😭"];

const MessageInput = ({ receiverId, isGroup = false }) => {
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
  const { sendGroupMessage } = useSocialStore();

  const sendConversationMessage = useCallback(
    (payload) => (isGroup ? sendGroupMessage(receiverId, payload) : sendMessage(receiverId, payload, socket)),
    [isGroup, receiverId, sendGroupMessage, sendMessage, socket]
  );

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
    if (!isGroup) socket?.emit("stop-typing", { receiverId });
    await sendConversationMessage(value);
  };

  const sendFiles = async (files) => {
    if (!files?.length) return;

    const formData = new FormData();
    formData.append("text", text.trim());
    Array.from(files).forEach((file) => formData.append("attachments", file));
    setText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await sendConversationMessage(formData);
  };

  const closeCamera = useCallback(() => {
    setCameraOpen(false);
  }, []);

  const sendCameraPhoto = useCallback(async (file) => {
    const formData = new FormData();
    formData.append("attachments", file);
    return sendConversationMessage(formData);
  }, [sendConversationMessage]);

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
      await sendConversationMessage(formData);
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
    <form
      onSubmit={handleSubmit}
      className="relative flex shrink-0 items-end gap-1.5 border-t border-white/10 bg-slate-950/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:gap-2 sm:p-3 md:p-4"
    >
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-2 right-2 grid grid-cols-6 gap-2 rounded-lg border border-white/10 bg-slate-950/95 p-3 shadow-xl sm:left-14 sm:right-auto">
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
        className="h-10 w-10 shrink-0 px-0 sm:h-11 sm:w-11"
        title="Add media"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus size={18} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-10 shrink-0 px-0 sm:h-11 sm:w-11"
        title="Open camera"
        onClick={() => setCameraOpen(true)}
      >
        <Camera size={18} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-10 shrink-0 px-0 sm:h-11 sm:w-11"
        title="Emoji"
        onClick={() => setShowEmojiPicker((value) => !value)}
      >
        <Smile size={18} />
      </Button>
      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          if (!isGroup) emitTyping();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
          }
        }}
        rows={1}
        placeholder="Message"
        className="max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-lg border border-slate-700/70 bg-slate-950/55 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-300/70 focus:ring-4 focus:ring-teal-300/10 sm:min-h-11 sm:px-4 sm:py-3"
      />
      <Button
        type="button"
        variant={isRecording ? "primary" : "ghost"}
        className="h-10 w-10 shrink-0 px-0 sm:h-11 sm:w-11"
        title={isRecording ? "Stop recording" : "Record voice"}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? <Square size={16} /> : <Mic size={18} />}
      </Button>
      <Button type="submit" className="h-10 w-10 shrink-0 px-0 sm:h-11 sm:w-11" title="Send message">
        <Send size={18} />
      </Button>
      <CameraCaptureModal open={cameraOpen} onClose={closeCamera} onSend={sendCameraPhoto} />
    </form>
  );
};

export default MessageInput;
