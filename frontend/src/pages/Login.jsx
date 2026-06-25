import { Lock, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { useAuthStore } from "../store/useAuthStore.js";

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthLoading } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ok = await login(form);
    if (ok) navigate("/");
  };

  return (
    <section className="glass mx-auto w-full max-w-md rounded-lg p-6 sm:p-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-300 to-pink-300 text-slate-950">
          <MessageCircle size={28} />
        </div>
        <h1 className="text-3xl font-extrabold">Welcome Back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in and continue chatting.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          icon={Mail}
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          icon={Lock}
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Enter your password"
          required
        />
        <Button type="submit" className="w-full" loading={isAuthLoading}>
          Login
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-semibold text-teal-200 hover:text-teal-100">
          Create Account
        </Link>
      </p>
    </section>
  );
};

export default Login;
