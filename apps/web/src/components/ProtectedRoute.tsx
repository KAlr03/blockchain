import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context.js";

export function ProtectedRoute() {
  const { authReady, token } = useAuth();

  if (!authReady) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f4f7f4" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:"0.75rem" }}>🌿</div>
          <p style={{ color:"#64748b", fontSize:"0.9rem", fontFamily:"Inter,sans-serif" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/" replace />;
}
