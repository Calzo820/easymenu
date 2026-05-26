import { Link, useLocation } from "react-router-dom";

const PRESETS = {
  owner: [
    { to: "/admin", label: "Menu", icon: "☰" },
    { to: "/tavoli", label: "Tavoli", icon: "▦" },
    { to: "/cucina", label: "Cucina", icon: "▣" },
    { to: "/bar", label: "Bar", icon: "◐" },
    { to: "/cassa", label: "Cassa", icon: "€" },
    { to: "/statistiche", label: "KPI", icon: "↟" },
  ],
  cashier: [
    { to: "/cassa", label: "Cassa", icon: "€" },
    { to: "/tavoli", label: "Tavoli", icon: "▦" },
    { to: "/cucina", label: "Cucina", icon: "▣" },
    { to: "/bar", label: "Bar", icon: "◐" },
    { to: "/storico", label: "Storico", icon: "◷" },
  ],
  kitchen: [
    { to: "/cucina", label: "Comande", icon: "▣" },
    { to: "/bar", label: "Bar", icon: "◐" },
    { to: "/cassa", label: "Cassa", icon: "€" },
  ],
  bar: [
    { to: "/bar", label: "Bar", icon: "◐" },
    { to: "/cucina", label: "Cucina", icon: "▣" },
    { to: "/cassa", label: "Cassa", icon: "€" },
  ],
};

export default function CommandDock({ mode = "owner", title = "Flusso rapido", actions = [] }) {
  const location = useLocation();
  const links = actions.length ? actions : PRESETS[mode] || PRESETS.owner;

  return (
    <div className="em-command-dock" role="navigation" aria-label={title}>
      <div className="em-command-title">{title}</div>
      <div className="em-command-list">
        {links.map((item) => {
          const active = location.pathname.startsWith(item.to);
          return (
            <Link key={item.to + item.label} to={item.to} className={active ? "em-command-item active" : "em-command-item"}>
              <span>{item.icon}</span>
              <b>{item.label}</b>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
