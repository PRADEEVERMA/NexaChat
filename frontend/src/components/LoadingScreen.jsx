import { MessageCircle } from "lucide-react";

const LoadingScreen = () => (
  <div className="grid min-h-dvh place-items-center bg-slate-950">
    <div className="text-center">
      <div className="mx-auto grid h-16 w-16 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-teal-300 to-pink-300 text-slate-950 shadow-glow">
        <MessageCircle size={30} />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-400">Preparing your conversations...</p>
    </div>
  </div>
);

export default LoadingScreen;
