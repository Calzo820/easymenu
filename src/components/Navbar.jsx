import { useEffect, useMemo, useState } from "react";
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

function initials(user) {
  const source = user?.name || user?.email || "EM";
  return source.slice(0, 2).toUpperCase();
}

export default function Navbar() {
  const location = useLocation();
  const user = getUser();
  const role = (user?.role || "").toLowerCase();
  const logged = isLoggedIn();
  const isSuperAdmin = Boolean(user?.isSuperAdmin) || role === "superadmin" || location.pathname.startsWith("/super-admin");
  const impersonating = hasPlatformSession() && !isSuperAdmin;
  const isOperational = ["/cucina", "/bar", "/cassa", "/tavoli"].some((path) => location.pathname.startsWith(path));
  const [open, setOpen] = useState(false);

  const restaurantName = isSuperAdmin
    ? "Piattaforma SaaS"
    : hasPlatformSession()
      ? `${getRistoranteAttivo() || "Ristorante"} · superadmin`
      : getRistoranteAttivo() || "Nessun ristorante";

  const isAdmin = !isSuperAdmin && (role === "admin" || role === "owner");
  const canKitchen = isAdmin || role === "kitchen";
  const canBar = isAdmin || role === "bar";
  const canCashier = isAdmin || role === "cashier";

  useEffect(() => {
    if (!logged) return undefined;
    document.body.classList.add("em-sidebar-ready");
    document.body.classList.toggle("em-sidebar-open", open);
    document.body.classList.toggle("em-sidebar-closed", !open);
    return () => {
      document.body.classList.remove("em-sidebar-ready", "em-sidebar-open", "em-sidebar-closed");
    };
  }, [logged, open]);

  const links = useMemo(() => {
    if (!logged) return [];
    if (isSuperAdmin) return [{ to: "/super-admin", label: "SuperAdmin", icon: "◎", match: ["/super-admin"] }];

    return [
      isAdmin && { to: "/dashboard", label: "Dashboard", icon: "⌂", match: ["/dashboard"] },
      canKitchen && { to: "/cucina", label: "Cucina", icon: "◴", match: ["/cucina"] },
      canBar && { to: "/bar", label: "Bar", icon: "◷", match: ["/bar"] },
      canCashier && { to: "/cassa", label: "Cassa", icon: "▣", match: ["/cassa"] },
      isAdmin && { to: "/tavoli", label: "Tavoli", icon: "▦", match: ["/tavoli", "/qr"] },
      isAdmin && { to: "/admin", label: "Menu", icon: "☰", match: ["/admin"] },
      isAdmin && { to: "/statistiche", label: "Report", icon: "↗", match: ["/statistiche", "/storico"] },
      isAdmin && { to: "/billing", label: "Piano", icon: "◌", match: ["/billing"] },
      isAdmin && { to: "/errori", label: "Alert", icon: "!", match: ["/errori"] },
    ].filter(Boolean);
  }, [logged, isSuperAdmin, isAdmin, canKitchen, canBar, canCashier]);

  if (!logged) return null;

  function isActive(link) {
    return (link.match || [link.to]).some((path) => location.pathname.startsWith(path));
  }

  function handleNavigate() {
    if (isOperational || window.innerWidth <= 1180) setOpen(false);
  }

  return (
    <>
      <style>{`
        body.em-sidebar-ready,
        body.em-sidebar-open,
        body.em-sidebar-closed { padding-left: 0 !important; }
        .em-menu-toggle {
          position: fixed;
          top: 14px;
          left: 14px;
          z-index: 1202;
          width: 46px;
          height: 46px;
          border-radius: 15px;
          border: 1px solid rgba(15,23,42,0.13);
          background: rgba(255,255,255,0.96);
          color: #0f172a;
          box-shadow: 0 16px 34px rgba(15,23,42,0.18);
          font-size: 22px;
          font-weight: 950;
          cursor: pointer;
        }
        .em-sidebar-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1198;
          background: rgba(2,6,23,0.36);
          opacity: 0;
          pointer-events: none;
          transition: opacity .18s ease;
        }
        .em-sidebar-backdrop.is-open { opacity: 1; pointer-events: auto; }
        .em-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: min(286px, 88vw);
          z-index: 1200;
          display: flex;
          flex-direction: column;
          background: #07111f;
          color: #f8fafc;
          border-right: 1px solid rgba(255,255,255,0.08);
          box-shadow: 24px 0 50px rgba(2,6,23,0.28);
          transform: translateX(-105%);
          transition: transform .2s ease;
        }
        .em-sidebar.is-open { transform: translateX(0); }
        .em-sidebar__brand { padding: 18px 16px 16px 72px; display: flex; gap: 12px; align-items: center; min-height: 80px; }
        .em-sidebar__logo { width: 42px; height: 42px; border-radius: 14px; background: white; display: grid; place-items: center; padding: 7px; overflow: hidden; flex: 0 0 auto; }
        .em-sidebar__logo img { width: 100%; height: 100%; object-fit: contain; }
        .em-sidebar__name { font-size: 18px; font-weight: 950; letter-spacing: -0.04em; line-height: 1; }
        .em-sidebar__restaurant { margin-top: 6px; color: #9fb0c7; font-size: 12px; font-weight: 750; display: flex; align-items: center; gap: 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .em-sidebar__dot { width: 10px; height: 10px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,0.12); }
        .em-sidebar__nav { display: grid; gap: 6px; padding: 14px; overflow: auto; }
        .em-sidebar__link { display: flex; align-items: center; gap: 14px; min-height: 48px; padding: 0 14px; border-radius: 16px; color: #cbd5e1; text-decoration: none; font-weight: 900; }
        .em-sidebar__link:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .em-sidebar__link.is-active { background: #fff; color: #07111f; }
        .em-sidebar__icon { width: 20px; display: inline-grid; place-items: center; font-size: 15px; }
        .em-sidebar__footer { margin-top: auto; padding: 14px; display: grid; gap: 10px; }
        .em-sidebar__user { display: flex; gap: 10px; align-items: center; padding: 10px; border-radius: 18px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.08); }
        .em-sidebar__avatar { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: #1d4ed8; color: white; font-size: 13px; font-weight: 950; flex: 0 0 auto; }
        .em-sidebar__email { max-width: 170px; color: #cbd5e1; font-size: 11px; font-weight: 750; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .em-sidebar__actions { display: grid; grid-template-columns: ${impersonating ? "1fr 1fr" : "1fr"}; gap: 8px; }
        .em-sidebar__btn { border: 1px solid rgba(255,255,255,0.10); border-radius: 13px; padding: 10px 11px; background: rgba(255,255,255,0.07); color: white; font-weight: 900; cursor: pointer; }
        .em-sidebar__btn--green { background: rgba(34,197,94,0.18); border-color: rgba(34,197,94,0.25); }
        @media print {
          .em-menu-toggle, .em-sidebar, .em-sidebar-backdrop { display: none !important; }
        }
      `}</style>

      <button className="em-menu-toggle" type="button" aria-label="Apri navigazione" onClick={() => setOpen((prev) => !prev)}>
        {open ? "×" : "☰"}
      </button>
      <div className={open ? "em-sidebar-backdrop is-open" : "em-sidebar-backdrop"} onClick={() => setOpen(false)} />

      <aside className={open ? "em-sidebar is-open" : "em-sidebar"} aria-label="Navigazione EasyMenu">
        <div className="em-sidebar__brand">
          <div className="em-sidebar__logo"><img src={logoEasyMenu} alt="EasyMenu" /></div>
          <div style={{ minWidth: 0 }}>
            <div className="em-sidebar__name">EasyMenu</div>
            <div className="em-sidebar__restaurant"><span className="em-sidebar__dot" />{restaurantName}</div>
          </div>
        </div>

        <nav className="em-sidebar__nav">
          {links.map((link) => (
            <Link key={link.to} to={link.to} onClick={handleNavigate} className={isActive(link) ? "em-sidebar__link is-active" : "em-sidebar__link"}>
              <span className="em-sidebar__icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="em-sidebar__footer">
          <div className="em-sidebar__user">
            <div className="em-sidebar__avatar">{initials(user)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 950 }}>{isSuperAdmin ? "SuperAdmin" : user?.name || "Staff"}</div>
              <div className="em-sidebar__email">{user?.email || ""}</div>
            </div>
          </div>
          <div className="em-sidebar__actions">
            {impersonating ? <button className="em-sidebar__btn em-sidebar__btn--green" onClick={restorePlatformSession}>SuperAdmin</button> : null}
            <button className="em-sidebar__btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </aside>
    </>
  );
}
