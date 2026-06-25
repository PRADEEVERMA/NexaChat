import { MessageCircleHeart } from "lucide-react";

const EmptyChat = () => (
  <section className="glass hidden h-full place-items-center rounded-lg lg:grid">
    <div className="max-w-sm text-center">
      <div className="mx-auto grid h-20 w-20 animate-float place-items-center rounded-2xl bg-gradient-to-br from-teal-300 to-pink-300 text-slate-950 shadow-glow">
        <MessageCircleHeart size={38} />
      </div>
      <h2 className="mt-8 text-2xl font-extrabold">{"\uD83D\uDC4B"} Welcome to NexaChat</h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        Start chatting by selecting a friend from the sidebar.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">Invite your friends to join NexaChat.</p>
    </div>
  </section>
);

export default EmptyChat;
