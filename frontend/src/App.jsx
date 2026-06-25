import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import LoadingScreen from "./components/LoadingScreen.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import GuestRoute from "./routes/GuestRoute.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";
import Profile from "./pages/Profile.jsx";
import { useAuthStore } from "./store/useAuthStore.js";

const App = () => {
  const { checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <LoadingScreen />;

  return (
    <>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(15, 23, 42, 0.92)",
            color: "#f8fafc",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            backdropFilter: "blur(18px)"
          }
        }}
      />
    </>
  );
};

export default App;
