import { Lock, Mail, MessageCircle, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { useAuthStore } from "../store/useAuthStore.js";

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthLoading } = useAuthStore();
  const [form, setForm] = useState({ name: "", email: "", password: "", avatar: null });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("email", form.email);
    formData.append("password", form.password);
    if (form.avatar) formData.append("avatar", form.avatar);

    const ok = await register(formData);
    if (ok) navigate("/");
  };

  return (
    <section className="glass mx-auto w-full max-w-md rounded-lg p-6 sm:p-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-300 to-pink-300 text-slate-950">
          <MessageCircle size={28} />
        </div>
        <h1 className="text-3xl font-extrabold">Create Account</h1>
        <p className="mt-2 text-sm text-slate-400">Join NexaChat and start chatting.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          icon={User}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Your name"
          minLength={2}
          required
        />
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
          placeholder="Minimum 6 characters"
          minLength={6}
          required
        />
        <Button type="submit" className="w-full" loading={isAuthLoading}>
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-teal-200 hover:text-teal-100">
          Login
        </Link>
      </p>
    </section>
  );
};

export default Register;
