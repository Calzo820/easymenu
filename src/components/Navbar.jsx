import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";

function getRistoranteAttivo() {
  return localStorage.getItem("ristorante_attivo") || "";
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return !!localStorage.getItem("auth_token");
}

function hasPlatformSession() {
  return !!localStorage.getItem("superadmin_platform_session");
}

function restorePlatformSession() {
  try {
    const snapshot = JSON.parse(localStorage.getItem("superadmin_platform_session") || "null");
    if (!snapshot?.token) return;
    localStorage.setItem("auth_token", snapshot.token);
    if (snapshot.user) localStorage.setItem("auth_user", snapshot.user);
    else localStorage.removeItem("auth_user");
    if (snapshot.restaurant) localStorage.setItem("auth_restaurant", snapshot.restaurant);
    else localStorage.removeItem("auth_restaurant");
    localStorage.removeItem("ristorante_attivo");
    localStorage.removeItem("restaurant_slug");
    localStorage.removeItem("restaurant_id");
    localStorage.removeItem("superadmin_platform_session");
    window.location.href = "/super-admin";
  } catch {
    localStorage.removeItem("superadmin_platform_session");
  }
}

function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(true);

  const user = getUser();
  const role = (user?.role || "").toLowerCase();
  const isSuperAdmin = Boolean(user?.isSuperAdmin) || role === "superadmin" || location.pathname.startsWith("/super-admin");
  const ristorante = isSuperAdmin
    ? "Piattaforma SaaS"
    : hasPlatformSession()
    ? `${getRistoranteAttivo() || "Ristorante"} · gestione superadmin`
    : getRistoranteAttivo() || "Nessun ristorante";
  const logged = isLoggedIn();
  const impersonating = hasPlatformSession() && !isSuperAdmin;

  const isAdmin = !isSuperAdmin && (role === "admin" || role === "owner");
  const canKitchen = isAdmin || role === "kitchen";
  const canBar = isAdmin || role === "bar";
  const canCashier = isAdmin || role === "cashier";

  const links = useMemo(() => {
    if (!logged) {
      return [
        { to: "/", label: "Home", match: ["/"] },
        { to: "/login", label: "Login", match: ["/login"] },
        { to: "/register", label: "Register", match: ["/register"] },
        { to: "/menu/demo/demo-table-1", label: "Demo Menu", match: ["/menu"] },
      ];
    }

    if (isSuperAdmin) {
      return [
        { to: "/super-admin", label: "Super Admin", match: ["/super-admin"] },
      ];
    }

    return [
      {
        to:
          role === "kitchen"
            ? "/cucina"
            : role === "bar"
            ? "/bar"
            : role === "cashier"
            ? "/cassa"
            : "/dashboard",
        label: "Dashboard",
        group: "",
        match: ["/dashboard"],
      },

      canKitchen && { to: "/cucina", label: "Cucina", group: "Operativo", match: ["/cucina"] },
      canBar && { to: "/bar", label: "Bar", group: "Operativo", match: ["/bar"] },
      canCashier && { to: "/cassa", label: "Cassa", group: "Operativo", match: ["/cassa"] },
      isAdmin && { to: "/tavoli", label: "Sala", group: "Operativo", match: ["/tavoli"] },

      isAdmin && { to: "/admin", label: "Gestione", group: "Gestione", match: ["/admin", "/qr", "/billing"] },
      isAdmin && { to: "/statistiche", label: "Report", group: "Gestione", match: ["/statistiche", "/storico"] },
    ].filter(Boolean);
  }, [logged, role, isSuperAdmin, isAdmin, canKitchen, canBar, canCashier]);

  function isActive(link) {
    return (link.match || [link.to]).some((path) => {
      if (path === "/") return location.pathname === "/";
      return location.pathname.startsWith(path);
    });
  }

  function handleNavigate() {
    setOpen(false);
  }

  function logout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_restaurant");
    localStorage.removeItem("ristorante_attivo");
    localStorage.removeItem("restaurant_slug");
    localStorage.removeItem("restaurant_id");
    localStorage.removeItem("superadmin_platform_session");

    window.location.href = "/login";
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        padding: "10px 18px",
        background: "rgba(8, 13, 23, 0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 18px 45px rgba(2,6,23,0.22)",
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: "linear-gradient(135deg, #ffffff 0%, #dbeafe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: 6,
              }}
            >
              <img
                src={logoEasyMenu}
                alt="EasyMenu"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>

            <div style={{ color: "white" }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>EasyMenu</div>

              <div style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center", opacity: .84 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: getRistoranteAttivo() ? "#22c55e" : "#f59e0b",
                  }}
                />
                {ristorante}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {logged && (
              <div
                style={{
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  opacity: 0.9,
                }}
              >
                {user?.email || ""}
              </div>
            )}

            {logged && impersonating && (
              <button
                onClick={restorePlatformSession}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "8px 12px",
                  background: "rgba(34,197,94,0.22)",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Torna SuperAdmin
              </button>
            )}

            {logged && (
              <button
                onClick={logout}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            )}

            <button
              onClick={() => setOpen((prev) => !prev)}
              style={{
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 15,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.12)",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {open ? "✕" : "☰"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: open ? "flex" : "none",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {links.map((link) => {
            const active = isActive(link);

            return (
              <Link
                key={link.label}
                to={link.to}
                onClick={handleNavigate}
                style={{
                  color: "white",
                  fontWeight: 850,
                  fontSize: 13,
                  padding: "9px 12px",
                  borderRadius: 12,
                  textDecoration: "none",
                  background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Navbar;