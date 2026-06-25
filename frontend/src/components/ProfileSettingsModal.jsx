import { Camera, X } from "lucide-react";
import { useEffect, useState } from "react";
import Avatar from "./Avatar.jsx";
import Button from "./Button.jsx";
import Input from "./Input.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { useCallStore } from "../store/useCallStore.js";
import { formatConversationDate, formatMessageTime } from "../utils/formatDate.js";
import { requestNotificationPermission } from "../utils/pwa.js";

const ProfileSettingsModal = ({ open, onClose }) => {
  const { authUser, updateProfile, isProfileLoading, logout } = useAuthStore();
  const { callHistory, loadCallHistory } = useCallStore();
  const [name, setName] = useState(authUser?.name || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [avatar, setAvatar] = useState(null);
  const [privacy, setPrivacy] = useState({
    lastSeen: authUser?.privacy?.lastSeen || "everyone",
    online: authUser?.privacy?.online || "everyone",
    readReceipts: authUser?.privacy?.readReceipts ?? true
  });
  const [appearance, setAppearance] = useState({
    theme: authUser?.appearance?.theme || "dark"
  });
  const [notifications, setNotifications] = useState({
    sound: authUser?.notifications?.sound ?? true,
    desktop: authUser?.notifications?.desktop ?? true
  });
  const [notificationPermission, setNotificationPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    if (open) loadCallHistory();
  }, [open, loadCallHistory]);

  if (!open) return null;

  const previewUser = avatar ? { ...authUser, avatar: URL.createObjectURL(avatar), name } : { ...authUser, name };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("bio", bio);
    formData.append("privacy", JSON.stringify(privacy));
    formData.append("appearance", JSON.stringify(appearance));
    formData.append("notifications", JSON.stringify(notifications));
    if (avatar) formData.append("avatar", avatar);

    const ok = await updateProfile(formData);
    if (ok) onClose();
  };

  const enableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      setNotifications((value) => ({ ...value, desktop: true }));
    }
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-white/10 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Profile</h2>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center">
            <div className="mx-auto w-fit">
              <Avatar user={previewUser} size="lg" online />
            </div>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-semibold hover:bg-slate-800">
              <Camera size={16} />
              Change photo
              <input type="file" accept="image/*" className="hidden" onChange={(event) => setAvatar(event.target.files?.[0] || null)} />
            </label>
          </div>

          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />

          <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase text-slate-400">Profile</h3>
            <p className="text-sm text-slate-400">Change your name, photo, and bio.</p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Bio</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-700/70 bg-slate-950/55 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-300/70 focus:ring-4 focus:ring-teal-300/10"
            />
          </label>

          <div className="space-y-3 rounded-lg border border-white/10 bg-slate-950/35 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-400">Privacy</h3>
            <label className="block text-sm">
              <span className="mb-2 block text-slate-300">Last seen</span>
              <select
                value={privacy.lastSeen}
                onChange={(event) => setPrivacy({ ...privacy, lastSeen: event.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value="everyone">Everyone</option>
                <option value="nobody">Nobody</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-slate-300">Online status</span>
              <select
                value={privacy.online}
                onChange={(event) => setPrivacy({ ...privacy, online: event.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value="everyone">Everyone</option>
                <option value="nobody">Nobody</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
              Read receipts
              <input
                type="checkbox"
                checked={privacy.readReceipts}
                onChange={(event) => setPrivacy({ ...privacy, readReceipts: event.target.checked })}
              />
            </label>
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 bg-slate-950/35 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-400">Appearance</h3>
            <div className="grid grid-cols-2 gap-2">
              {["dark", "light"].map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${
                    appearance.theme === theme ? "border-teal-300 bg-teal-300/10 text-teal-100" : "border-slate-700 bg-slate-950/60"
                  }`}
                  onClick={() => setAppearance({ theme })}
                >
                  {theme} mode
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 bg-slate-950/35 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-400">Notifications</h3>
            <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
              Sound
              <input
                type="checkbox"
                checked={notifications.sound}
                onChange={(event) => setNotifications({ ...notifications, sound: event.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
              Desktop notifications
              <input
                type="checkbox"
                checked={notifications.desktop}
                onChange={(event) => setNotifications({ ...notifications, desktop: event.target.checked })}
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={enableNotifications}
              disabled={notificationPermission === "granted" || notificationPermission === "unsupported"}
            >
              {notificationPermission === "granted"
                ? "Notifications enabled"
                : notificationPermission === "denied"
                  ? "Notifications blocked"
                  : notificationPermission === "unsupported"
                    ? "Notifications unsupported"
                    : "Enable notifications"}
            </Button>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1" loading={isProfileLoading}>
              Save
            </Button>
            <Button type="button" variant="ghost" onClick={logout}>
              Logout
            </Button>
          </div>

          <div className="rounded-lg border border-rose-400/20 bg-rose-500/10 p-4">
            <h3 className="mb-2 text-sm font-bold uppercase text-rose-200">Account</h3>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={logout}>
                Logout
              </Button>
              <Button type="button" variant="danger" className="flex-1" disabled title="Delete account">
                Delete account
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="mb-3 text-sm font-bold uppercase text-slate-400">Call history</h3>
          <div className="space-y-2">
            {callHistory.length === 0 && <p className="text-sm text-slate-500">No calls yet</p>}
            {callHistory.map((item) => {
              const outgoing = item.callerId?._id === authUser?._id;
              const person = outgoing ? item.receiverId : item.callerId;
              const missed = item.status === "missed";

              return (
                <div key={item._id} className="rounded-lg bg-slate-950/45 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{person?.name || "NexaChat user"}</p>
                    <span className={missed ? "text-xs font-semibold text-rose-300" : "text-xs text-slate-500"}>
                      {missed ? "Missed Call" : item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.type === "video" ? "Video Call" : "Audio Call"} / {outgoing ? "Outgoing" : "Incoming"} /{" "}
                    {formatConversationDate(item.createdAt)} {formatMessageTime(item.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProfileSettingsModal;
