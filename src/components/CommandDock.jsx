import { Link, useLocation } from "react-router-dom";

const primaryLinks = [
  { to: "/dashboard", label: "Oggi", icon: "🏠", roles: ["owner", "admin"] },
  { to: "/tavoli", label: "Sala", icon: "🍽️", roles: ["owner", "admin", "cashier"] },
  { to: "/cucina", label: "Cucina", icon: "👨‍🍳", roles: ["owner", "admin", "kitchen"] },
  { to: "/bar", label: "Bar", icon: "🍹", roles: ["owner", "admin", "bar"] },
  { to: "/cassa", label: "Cassa", icon: "💳", roles: ["owner", "admin", "cashier"] },
  { to: "/admin", label: "Menu", icon: "📦", roles: ["owner", "admin"] },
  { to: "/statistiche", label: "Analisi", icon: "📈", roles: ["owner", "admin"] },
];

const secondaryLinks = [
  { to: "/qr", label: "QR tavoli", roles: ["owner", "admin"] },
  { to: "/storico", label: "Storico", roles: ["owner", "admin"] },
  { to: "/billing", label: "Billing", roles: ["owner", "admin"] },
  { to: "/errori", label: "Log", roles: ["owner", "admin"] },
];

function getUserRole() {
  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "null");
    return (user?.role || "").toLowerCase();
  } catch {
    return "";
  }
}

function canSee(link, role) {
  if (role === "superadmin") return link.to === "/super-admin";
  if (role === "owner" || role === "admin") return true;
  return link.roles.includes(role);
}

export default function CommandDock({ compact = false }) {
  const location = useLocation();
  const role = getUserRole();
  const visiblePrimary = primaryLinks.filter((link) => canSee(link, role));
  const visibleSecondary = secondaryLinks.filter((link) => canSee(link, role));

  return (
    <nav className={compact ? "em-command-dock em-command-dock--compact" : "em-command-dock"} aria-label="Navigazione EasyMenu">
      <div className="em-command-dock__main">
        {visiblePrimary.map((link) => {
          const active = location.pathname.startsWith(link.to);
          return (
            <Link key={link.to} to={link.to} className={active ? "em-command-link is-active" : "em-command-link"}>
              <span>{link.icon}</span>
              <b>{link.label}</b>
            </Link>
          );
        })}
      </div>

      {!compact && visibleSecondary.length ? (
        <div className="em-command-dock__secondary">
          {visibleSecondary.map((link) => (
            <Link key={link.to} to={link.to}>{link.label}</Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
