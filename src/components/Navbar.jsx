import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";

function getUser() {
  try { return JSON.parse(localStorage.getItem("auth_user") || "null"); } catch { return null; }
}
function isLoggedIn() { return !!localStorage.getItem("auth_token"); }
function getRestaurantName() {
  try {
    const restaurant = JSON.parse(localStorage.getItem("auth_restaurant") || "null");
    return restaurant?.name || localStorage.getItem("ristorante_attivo") || "EasyMenu";
  } catch {
    return localStorage.getItem("ristorante_attivo") || "EasyMenu";
  }
}
function hasPlatformSession() { return !!localStorage.getItem("superadmin_platform_session"); }
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

const icons = {
  dashboard: "⌘",
  sala: "◌",
  cucina: "▦",
  bar: "◍",
  cassa: "◧",
  menu: "☰",
  tavoli: "▤",
  report: "↗",
  settings: "⚙",
  logout: "×",
};

function NavItem({ to, icon, label, active, onClick, danger }) {
  if (onClick) {
    return <button type="button" onClick={onClick} className={`em3-nav-item ${danger ? "danger" : ""}`}><span>{icon}</span><b>{label}</b></button>;
  }
  return <Link to={to} className={`em3-nav-item ${active ? "active" : ""}`}><span>{icon}</span><b>{label}</b></Link>;
}

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getUser();
  const role = (user?.role || "").toLowerCase();
  const logged = isLoggedIn();
  const isSuperAdmin = Boolean(user?.isSuperAdmin) || role === "superadmin" || location.pathname.startsWith("/super-admin");
  const isAdmin = !isSuperAdmin && (role === "admin" || role === "owner");
  const canKitchen = isAdmin || role === "kitchen";
  const canBar = isAdmin || role === "bar";
  const canCashier = isAdmin || role === "cashier";
  const restaurantName = isSuperAdmin ? "Piattaforma" : getRestaurantName();

  const nav = useMemo(() => {
    if (!logged) return [{ title: "", items: [
      { to: "/", label: "Home", icon: icons.dashboard },
      { to: "/login", label: "Login", icon: icons.settings },
      { to: "/register", label: "Registrati", icon: icons.sala },
    ] }];
    if (isSuperAdmin) return [{ title: "", items: [{ to: "/super-admin", label: "Super Admin", icon: icons.dashboard }] }];

    const first = role === "kitchen" ? "/cucina" : role === "bar" ? "/bar" : role === "cashier" ? "/cassa" : "/dashboard";
    return [
      { title: "", items: [{ to: first, label: "Dashboard", icon: icons.dashboard, match: ["/dashboard", "/"] }] },
      { title: "Operativo", items: [
        isAdmin && { to: "/tavoli", label: "Sala", icon: icons.sala, match: ["/tavoli", "/qr"] },
        canKitchen && { to: "/cucina", label: "Cucina", icon: icons.cucina },
        canBar && { to: "/bar", label: "Bar", icon: icons.bar },
        canCashier && { to: "/cassa", label: "Cassa", icon: icons.cassa },
      ].filter(Boolean) },
      { title: "Gestione", items: [
        isAdmin && { to: "/admin", label: "Menu", icon: icons.menu },
        isAdmin && { to: "/statistiche", label: "Report", icon: icons.report, match: ["/statistiche", "/storico"] },
        isAdmin && { to: "/billing", label: "Impostazioni", icon: icons.settings, match: ["/billing", "/errori"] },
      ].filter(Boolean) },
    ];
  }, [logged, isSuperAdmin, role, isAdmin, canKitchen, canBar, canCashier]);

  function active(item) {
    const paths = item.match || [item.to];
    return paths.some((p) => p === "/" ? location.pathname === "/" : location.pathname.startsWith(p));
  }

  function logout() {
    ["auth_token", "auth_user", "auth_restaurant", "ristorante_attivo", "restaurant_slug", "restaurant_id", "superadmin_platform_session"].forEach((key) => localStorage.removeItem(key));
    window.location.href = "/login";
  }

  return <>
    <button className="em3-mobile-toggle" type="button" onClick={() => setMobileOpen((v) => !v)}>☰ EasyMenu</button>
    <aside className={`em3-sidebar ${mobileOpen ? "open" : ""}`}>
      <Link to={logged ? (isSuperAdmin ? "/super-admin" : "/dashboard") : "/"} className="em3-brand" onClick={() => setMobileOpen(false)}>
        <img src={logoEasyMenu} alt="EasyMenu" />
        <div><strong>EasyMenu</strong><small>{restaurantName}</small></div>
      </Link>

      <div className="em3-restaurant-pill"><span /> Operativo live</div>

      <nav className="em3-nav">
        {nav.map((group, index) => <div className="em3-nav-group" key={`${group.title}-${index}`}>
          {group.title ? <div className="em3-nav-title">{group.title}</div> : null}
          {group.items.map((item) => <NavItem key={item.to} {...item} active={active(item)} onClick={undefined} />)}
        </div>)}
      </nav>

      <div className="em3-sidebar-bottom">
        {logged && hasPlatformSession() && !isSuperAdmin ? <button type="button" className="em3-impersonate" onClick={restorePlatformSession}>Torna a piattaforma</button> : null}
        {logged ? <div className="em3-user"><small>{role || "utente"}</small><strong>{user?.email || "Account"}</strong></div> : null}
        {logged ? <NavItem icon={icons.logout} label="Esci" onClick={logout} danger /> : null}
      </div>
    </aside>
    {mobileOpen ? <button className="em3-backdrop" onClick={() => setMobileOpen(false)} aria-label="Chiudi menu" /> : null}
  </>;
}
