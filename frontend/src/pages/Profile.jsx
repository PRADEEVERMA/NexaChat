import { ArrowLeft, Camera, Mail, Save, User } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/Avatar.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { useAuthStore } from "../store/useAuthStore.js";

const Profile = () => {
  const { authUser, updateProfile, isProfileLoading } = useAuthStore();
  const [name, setName] = useState(authUser?.name || "");
  const [avatarFile, setAvatarFile] = useState(null);

  const previewUser = useMemo(() => {
    if (!avatarFile) return authUser;
    return { ...authUser, avatar: URL.createObjectURL(avatarFile), name };
  }, [authUser, avatarFile, name]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    if (avatarFile) formData.append("avatar", avatarFile);
    await updateProfile(formData);
  };

  return (
    <main className="min-h-screen px-4 py-6">
      <section className="glass mx-auto max-w-3xl rounded-lg p-5 sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Profile</h1>
            <p className="mt-1 text-sm text-slate-400">Manage your public chat identity.</p>
          </div>
          <Link
            to="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/60 text-slate-200 transition hover:bg-slate-800"
            title="Back to chat"
          >
            <ArrowLeft size={18} />
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-8 md:grid-cols-[220px_1fr]">
          <div className="text-center">
            <div className="mx-auto w-fit">
              <Avatar user={previewUser} size="lg" online />
            </div>
            <label className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/70 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-800">
              <Camera size={17} />
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
              />
            </label>
            <p className="mt-3 text-xs text-slate-500">PNG, JPG, or WebP up to 2MB.</p>
          </div>

          <div className="space-y-4">
            <Input label="Name" icon={User} value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Email" icon={Mail} value={authUser?.email || ""} disabled className="cursor-not-allowed opacity-70" />
            <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
              <p className="text-sm font-semibold">Account details</p>
              <p className="mt-2 text-sm text-slate-400">
                Joined {authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString() : "recently"}
              </p>
            </div>
            <Button type="submit" loading={isProfileLoading}>
              <Save size={18} />
              Save changes
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default Profile;
