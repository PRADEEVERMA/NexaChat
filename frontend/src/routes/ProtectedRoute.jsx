import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";

const ProtectedRoute = () => {
  const { authUser } = useAuthStore();
  return authUser ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
