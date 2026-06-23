import { useEffect, useMemo } from "react";
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

function Navbar() {
  const location = useLocation();
  const user = getUser();
  const role = (user?.role || "").toLowerCase();
  const logged = isLoggedIn();
  const isSuperAdmin = Boolean(user?.isSuperAdmin) || role === "superadmin" || location.pathname.startsWith("/super-admin");
  const impersonating = hasPlatformSession() && !isSuperAdmin;
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
    document.body.classList.add("em-has-sidebar");
    return () => document.body.classList.remove("em-has-sidebar");
  }, [logged]);

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

  return (
    <>
      <style>{`
        body.em-has-sidebar { padding-left: 244px; }
        .em-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 244px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          background: #09111f;
          color: #f8fafc;
          border-right: 1px solid rgba(255,255,255,0.08);
          box-shadow: 18px 0 45px rgba(2,6,23,0.22);
        }
        .em-sidebar__brand { padding: 18px 16px 14px; display: flex; gap: 12px; align-items: center; }
        .em-sidebar__logo { width: 42px; height: 42px; border-radius: 14px; background: white; display: grid; place-items: center; padding: 7px; overflow: hidden; flex: 0 0 auto; }
        .em-sidebar__logo img { width: 100%; height: 100%; object-fit: contain; }
        .em-sidebar__name { font-size: 18px; font-weight: 950; letter-spacing: -0.04em; line-height: 1; }
        .em-sidebar__restaurant { margin-top: 6px; color: #9fb0c7; font-size: 12px; font-weight: 750; display: flex; align-items: center; gap: 7px; line-height: 1.25; }
        .em-sidebar__dot { width: 8px; height: 8px; border-radius: 999px; background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,0.12); }
        .em-sidebar__nav { padding: 12px; display: grid; gap: 7px; }
        .em-sidebar__link { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 10px 12px; border-radius: 14px; color: #d7e1ef; text-decoration: none; font-size: 14px; font-weight: 850; border: 1px solid transparent; }
        .em-sidebar__link:hover { background: rgba(255,255,255,0.06); color: white; transform: none; }
        .em-sidebar__link.is-active { background: #ffffff; color: #07111f; box-shadow: 0 14px 26px rgba(0,0,0,0.18); }
        .em-sidebar__icon { width: 22px; text-align: center; font-weight: 950; }
        .em-sidebar__footer { margin-top: auto; padding: 12px; display: grid; gap: 10px; }
        .em-sidebar__user { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); min-width: 0; }
        .em-sidebar__avatar { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; background: #1d4ed8; color: white; font-size: 13px; font-weight: 950; flex: 0 0 auto; }
        .em-sidebar__email { min-width: 0; color: #cbd5e1; font-size: 11px; font-weight: 750; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .em-sidebar__actions { display: grid; grid-template-columns: ${impersonating ? "1fr 1fr" : "1fr"}; gap: 8px; }
        .em-sidebar__btn { border: 1px solid rgba(255,255,255,0.10); border-radius: 13px; padding: 10px 11px; background: rgba(255,255,255,0.07); color: white; font-weight: 900; cursor: pointer; }
        .em-sidebar__btn--green { background: rgba(34,197,94,0.18); border-color: rgba(34,197,94,0.25); }
        @media (max-width: 900px) {
          body.em-has-sidebar { padding-left: 0; padding-bottom: 74px; }
          .em-sidebar { inset: auto 0 0 0; width: 100%; height: 70px; flex-direction: row; align-items: center; border-right: 0; border-top: 1px solid rgba(255,255,255,0.08); }
          .em-sidebar__brand, .em-sidebar__footer { display: none; }
          .em-sidebar__nav { width: 100%; padding: 8px; display: flex; gap: 6px; overflow-x: auto; }
          .em-sidebar__link { flex: 0 0 auto; min-height: 52px; padding: 9px 12px; flex-direction: column; gap: 3px; font-size: 11px; border-radius: 14px; }
        }
      `}</style>

      <aside className="em-sidebar" aria-label="Navigazione EasyMenu">
        <div className="em-sidebar__brand">
          <div className="em-sidebar__logo"><img src={logoEasyMenu} alt="EasyMenu" /></div>
          <div style={{ minWidth: 0 }}>
            <div className="em-sidebar__name">EasyMenu</div>
            <div className="em-sidebar__restaurant"><span className="em-sidebar__dot" />{restaurantName}</div>
          </div>
        </div>

        <nav className="em-sidebar__nav">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={isActive(link) ? "em-sidebar__link is-active" : "em-sidebar__link"}>
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

export default Navbar;
