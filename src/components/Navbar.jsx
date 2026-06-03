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

function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const ristorante = getRistoranteAttivo() || "Nessun ristorante";
  const user = getUser();
  const logged = isLoggedIn();

  const role = (user?.role || "").toLowerCase();

  const isAdmin = role === "admin" || role === "owner";
  const canKitchen = isAdmin || role === "kitchen";
  const canBar = isAdmin || role === "bar";
  const canCashier = isAdmin || role === "cashier";

  const links = useMemo(() => {
    if (!logged) {
      return [
        { to: "/", label: "Landing", match: ["/"] },
        { to: "/login", label: "Login", match: ["/login"] },
        { to: "/register", label: "Register", match: ["/register"] },
        { to: "/menu/demo/demo-table-1", label: "Demo Menu", match: ["/menu"] },
        { to: "/demo-ristorante", label: "Demo Ristorante", match: ["/demo-ristorante"] },
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
        label: "Home",
        match: ["/dashboard"],
      },

      canKitchen && { to: "/cucina", label: "Cucina", match: ["/cucina"] },
      canBar && { to: "/bar", label: "Bar", match: ["/bar"] },
      canCashier && { to: "/cassa", label: "Cassa", match: ["/cassa"] },

      isAdmin && { to: "/tavoli", label: "Sala", match: ["/tavoli"] },
      isAdmin && { to: "/admin", label: "Menu/Admin", match: ["/admin"] },
      isAdmin && { to: "/qr", label: "QR", match: ["/qr"] },
      isAdmin && { to: "/storico", label: "Storico", match: ["/storico"] },
      isAdmin && { to: "/statistiche", label: "Statistiche", match: ["/statistiche"] },
      isAdmin && { to: "/billing", label: "Abbonamento", match: ["/billing"] },
      isAdmin && { to: "/errori", label: "Errori", match: ["/errori"] },
    ].filter(Boolean);
  }, [logged, role, isAdmin, canKitchen, canBar, canCashier]);

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

    window.location.href = "/login";
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        padding: "8px 12px",
        background:
          "linear-gradient(135deg, rgba(18,59,107,0.90) 0%, rgba(29,78,216,0.84) 55%, rgba(8,145,178,0.78) 100%)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 14px 28px rgba(18,59,107,0.14)",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
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
                width: 38,
                height: 38,
                borderRadius: 15,
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
              <div style={{ fontWeight: 900, fontSize: 17 }}>EasyMenu</div>

              <div style={{ fontSize: 13, display: "flex", gap: 8 }}>
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
                padding: "8px 11px",
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
            gap: 8,
            flexWrap: "wrap",
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
                  fontWeight: 800,
                  fontSize: 13,
                  padding: "8px 11px",
                  borderRadius: 14,
                  textDecoration: "none",
                  background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
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