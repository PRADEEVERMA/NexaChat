import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";

const GuestRoute = () => {
  const { authUser } = useAuthStore();
  return authUser ? <Navigate to="/" replace /> : <Outlet />;
};

export default GuestRoute;
