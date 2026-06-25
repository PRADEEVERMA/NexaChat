import { LogOut, MessageCircle, Plus, Search, Settings } from "lucide-react";
import { useEffect } from "react";
import Avatar from "./Avatar.jsx";
import Button from "./Button.jsx";
import Input from "./Input.jsx";
import Skeleton from "./Skeleton.jsx";
import UserListItem from "./UserListItem.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";
import { useSocialStore } from "../store/useSocialStore.js";

const Sidebar = ({ search, setSearch, onOpenProfile }) => {
  const { authUser, logout, onlineUsers } = useAuthStore();
  const { users, selectedUser, setSelectedUser, isUsersLoading, unreadByUser } = useChatStore();
  const visibleUsers = users.filter((user) => user._id !== authUser?._id);
  const onlinePeople = visibleUsers.filter((user) => onlineUsers.includes(user._id) || user.isOnline);
  const offlinePeople = visibleUsers.filter((user) => !onlineUsers.includes(user._id) && !user.isOnline);
  const { groups, getGroups, createGroup } = useSocialStore();

  useEffect(() => {
    getGroups(search);
  }, [getGroups, search]);

  const handleCreateGroup = async () => {
    const name = window.prompt("Group name");
    if (!name?.trim()) return;
    await createGroup({ name, members: visibleUsers.map((user) => user._id) });
  };

  return (
    <aside className="glass flex h-full min-h-0 flex-col rounded-lg">
      <header className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-teal-300 to-pink-300 text-slate-950">
              <MessageCircle size={22} />
            </div>
            <div>
              <h1 className="font-extrabold">NexaChat</h1>
              <p className="text-xs text-slate-400">{onlinePeople.length} online now</p>
            </div>
          </div>
          <Button type="button" variant="ghost" className="h-10 w-10 px-0" title="Settings" onClick={onOpenProfile}>
            <Settings size={18} />
          </Button>
        </div>
        <div className="mt-4">
          <Input icon={Search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search friends" />
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {isUsersLoading &&
          Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16" />)}

        {!isUsersLoading && (
          <>
            {onlinePeople.length > 0 && (
              <div className="pb-2">
                <p className="px-3 pb-2 text-xs font-bold uppercase text-slate-500">Online users</p>
                {onlinePeople.map((user) => (
                  <UserListItem
                    key={user._id}
                    user={user}
                    active={selectedUser?._id === user._id}
                    online
                    unread={unreadByUser[user._id]}
                    onClick={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            )}

            <div>
              <p className="px-3 pb-2 text-xs font-bold uppercase text-slate-500">Offline users</p>
              {offlinePeople.map((user) => (
                <UserListItem
                  key={user._id}
                  user={user}
                  active={selectedUser?._id === user._id}
                  online={onlineUsers.includes(user._id) || user.isOnline}
                  unread={unreadByUser[user._id]}
                  onClick={() => setSelectedUser(user)}
                />
              ))}
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between px-3 pb-2">
                <p className="text-xs font-bold uppercase text-slate-500">Groups</p>
                <button
                  type="button"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900/80 text-slate-200 transition hover:bg-slate-800"
                  title="Create group"
                  onClick={handleCreateGroup}
                >
                  <Plus size={15} />
                </button>
              </div>
              {groups.map((group) => (
                <div
                  key={group._id}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left"
                >
                  <Avatar user={{ name: group.name, avatar: group.avatar }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-100">{group.name}</span>
                    <span className="text-xs text-slate-500">{group.members?.length || 0} members</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {!isUsersLoading && visibleUsers.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-slate-500">
            <p className="font-semibold text-slate-300">{"\uD83D\uDC4B"} Welcome to NexaChat</p>
            <p className="mt-2">Start chatting by selecting a friend from the sidebar.</p>
            <p className="mt-2">Invite your friends to join NexaChat.</p>
          </div>
        )}
      </div>

      <footer className="flex items-center gap-3 border-t border-white/10 p-4">
        <button type="button" title="Profile" onClick={onOpenProfile}>
          <Avatar user={authUser} online />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{authUser?.name}</p>
          <p className="truncate text-xs text-slate-500">{authUser?.email}</p>
        </div>
        <Button variant="ghost" className="h-10 w-10 px-0" onClick={logout} title="Logout">
          <LogOut size={18} />
        </Button>
      </footer>
    </aside>
  );
};

export default Sidebar;
