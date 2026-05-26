import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiGet, clearAuthSession, getAuthToken } from "../lib/api";

function ProtectedRoute({ children, roles = [] }) {
  const token = getAuthToken();
  const [state, setState] = useState({ loading: true, allowed: false, user: null });

  const normalizedRoles = useMemo(() => roles.map((role) => String(role || "").toLowerCase()), [roles]);

  useEffect(() => {
    let active = true;

    async function verify() {
      if (!token) {
        if (active) setState({ loading: false, allowed: false, user: null });
        return;
      }

      try {
        const data = await apiGet("/auth/me");
        const user = data?.user || null;

        if (!user) throw new Error("Sessione non valida");

        localStorage.setItem("auth_user", JSON.stringify(user));
        if (data?.restaurant) {
          localStorage.setItem("auth_restaurant", JSON.stringify(data.restaurant));
          localStorage.setItem("ristorante_attivo", data.restaurant.name || "");
          localStorage.setItem("restaurant_slug", data.restaurant.slug || "");
          localStorage.setItem("restaurant_id", data.restaurant.id || "");
        }

        const normalizedRole = String(user.role || "").toLowerCase();
        const allowed = normalizedRole === "superadmin" || normalizedRoles.length === 0 || normalizedRoles.includes(normalizedRole);
        if (active) setState({ loading: false, allowed, user });
      } catch {
        clearAuthSession();
        if (active) setState({ loading: false, allowed: false, user: null });
      }
    }

    verify();
    return () => {
      active = false;
    };
  }, [token, normalizedRoles]);

  if (!token) return <Navigate to="/login" replace />;

  if (state.loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eff6ff" }}>
        <div style={{ fontWeight: 800, color: "#1e3a8a" }}>Verifica sessione in corso...</div>
      </div>
    );
  }

  if (!state.allowed) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;
