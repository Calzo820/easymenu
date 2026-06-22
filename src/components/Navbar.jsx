import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";
import { Badge, Button } from "./ui";

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

const icon = {
  dashboard: "⌘",
  sala: "▦",
  cucina: "◒",
  bar: "◐",
  cassa: "€",
  menu: "≡",
  tavoli: "□",
  report: "↗",
  impostazioni: "⚙",
  login: "→",
};

function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const user = getUser();
  const role = (user?.role || "").toLowerCase();
  const isSuperAdmin = Boolean(user?.isSuperAdmin) || role === "superadmin" || location.pathname.startsWith("/super-admin");
  const logged = isLoggedIn();
  const impersonating = hasPlatformSession() && !isSuperAdmin;
  const restaurantName = getRistoranteAttivo();
  const ristorante = isSuperAdmin
    ? "Piattaforma SaaS"
    : impersonating
    ? `${restaurantName || "Ristorante"} · gestione superadmin`
    : restaurantName || "Setup ristorante";

  const isAdmin = !isSuperAdmin && (role === "admin" || role === "owner");
  const canKitchen = isAdmin || role === "kitchen";
  const canBar = isAdmin || role === "bar";
  const canCashier = isAdmin || role === "cashier";

  const groups = useMemo(() => {
    if (!logged) {
      return [
        {
          label: "Accesso",
          items: [
            { to: "/", label: "Home", icon: icon.dashboard, match: ["/"] },
            { to: "/login", label: "Login", icon: icon.login, match: ["/login"] },
            { to: "/register", label: "Register", icon: "+", match: ["/register"] },
            { to: "/menu/demo/demo-table-1", label: "Demo", icon: "◌", match: ["/menu"] },
          ],
        },
      ];
    }

    if (isSuperAdmin) {
      return [{ label: "Platform", items: [{ to: "/super-admin", label: "Super Admin", icon: "◆", match: ["/super-admin"] }] }];
    }

    const defaultStart = role === "kitchen" ? "/cucina" : role === "bar" ? "/bar" : role === "cashier" ? "/cassa" : "/dashboard";

    return [
      {
        label: "Home",
        items: [{ to: defaultStart, label: "Dashboard", icon: icon.dashboard, match: ["/dashboard"] }],
      },
      {
        label: "Operativo",
        items: [
          isAdmin && { to: "/tavoli", label: "Sala", icon: icon.sala, match: ["/tavoli", "/qr"] },
          canKitchen && { to: "/cucina", label: "Cucina", icon: icon.cucina, match: ["/cucina"] },
          canBar && { to: "/bar", label: "Bar", icon: icon.bar, match: ["/bar"] },
          canCashier && { to: "/cassa", label: "Cassa", icon: icon.cassa, match: ["/cassa"] },
        ].filter(Boolean),
      },
      isAdmin && {
        label: "Gestione",
        items: [
          { to: "/admin", label: "Menu", icon: icon.menu, match: ["/admin"] },
          { to: "/statistiche", label: "Report", icon: icon.report, match: ["/statistiche", "/storico"] },
          { to: "/billing", label: "Impostazioni", icon: icon.impostazioni, match: ["/billing", "/errori"] },
        ],
      },
    ].filter(Boolean);
  }, [logged, role, isSuperAdmin, isAdmin, canKitchen, canBar, canCashier]);

  function isActive(link) {
    return (link.match || [link.to]).some((path) => {
      if (path === "/") return location.pathname === "/";
      return location.pathname.startsWith(path);
    });
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

  const navGroups = groups.map((group) => (
    <nav className="em-nav-group" key={group.label} aria-label={group.label}>
      <span className="em-nav-label">{group.label}</span>
      {group.items.map((link) => (
        <Link
          key={`${group.label}-${link.label}`}
          to={link.to}
          onClick={() => setOpen(false)}
          className={`em-nav-link ${isActive(link) ? "is-active" : ""}`}
        >
          <span>{link.icon}</span>
          <span>{link.label}</span>
        </Link>
      ))}
    </nav>
  ));

  return (
    <header className="em-app-nav">
      <div className="em-app-nav__inner">
        <Link className="em-brand-lockup" to={logged ? (isSuperAdmin ? "/super-admin" : "/dashboard") : "/"}>
          <span className="em-brand-logo"><img src={logoEasyMenu} alt="EasyMenu" /></span>
          <span>
            <span className="em-brand-name">EasyMenu</span>
            <span className="em-brand-sub"><span className="em-dot" />{ristorante}</span>
          </span>
        </Link>

        <div className="em-nav-sections">{navGroups}</div>

        <div className="em-nav-actions">
          {logged ? <span className="em-user-pill">{user?.email || role || "Utente"}</span> : null}
          {logged && impersonating ? <Button variant="success" onClick={restorePlatformSession}>SuperAdmin</Button> : null}
          {logged ? <Button variant="ghost" onClick={logout}>Esci</Button> : <Badge tone="blue" dot>Demo attiva</Badge>}
          <Button className="em-nav-toggle" variant="dark" onClick={() => setOpen((prev) => !prev)}>{open ? "Chiudi" : "Menu"}</Button>
        </div>
      </div>

      <div className={`em-mobile-menu ${open ? "is-open" : ""}`}>{navGroups}</div>
    </header>
  );
}

export default Navbar;
