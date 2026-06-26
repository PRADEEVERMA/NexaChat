import { MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <main className="min-h-dvh overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-sm text-teal-100">
              <Sparkles size={16} />
              Connect. Chat. Stay Together.
            </div>
            <h1 className="text-5xl font-extrabold leading-tight text-white">
              NexaChat keeps every conversation close.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Sign in, find your friends, and keep the conversation moving from any device.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="glass rounded-lg p-5">
                <MessageCircle className="mb-4 text-teal-300" />
                <h2 className="font-semibold">Instant messages</h2>
                <p className="mt-2 text-sm text-slate-400">New replies appear as soon as they are sent.</p>
              </div>
              <div className="glass rounded-lg p-5">
                <ShieldCheck className="mb-4 text-pink-300" />
                <h2 className="font-semibold">Friendly and familiar</h2>
                <p className="mt-2 text-sm text-slate-400">See who is online, who is typing, and when messages are read.</p>
              </div>
            </div>
          </div>
        </section>
        <Outlet />
      </div>
    </main>
  );
};

export default AuthLayout;
