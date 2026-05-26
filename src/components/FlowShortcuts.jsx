import { Link } from "react-router-dom";

const DEFAULT_ITEMS = [
  { to: "/dashboard", label: "Dashboard", hint: "Vista owner", icon: "📊" },
  { to: "/tavoli", label: "Tavoli", hint: "Sala e QR", icon: "🪑" },
  { to: "/cucina", label: "Cucina", hint: "Piatti live", icon: "👨‍🍳" },
  { to: "/bar", label: "Bar", hint: "Bevande", icon: "🥤" },
  { to: "/cassa", label: "Cassa", hint: "Conti rapidi", icon: "💳" },
];

export default function FlowShortcuts({ title = "Flusso operativo", items = DEFAULT_ITEMS }) {
  return (
    <div className="em-flow-rail" aria-label={title}>
      <div className="em-flow-rail-head">
        <span>{title}</span>
        <small>1 click · niente menu inutili</small>
      </div>

      <div className="em-flow-rail-grid">
        {items.map((item) => (
          <Link key={item.to + item.label} to={item.to} className="em-flow-tile">
            <span className="em-flow-icon">{item.icon}</span>
            <span>
              <b>{item.label}</b>
              <small>{item.hint}</small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
