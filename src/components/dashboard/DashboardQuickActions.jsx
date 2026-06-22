import { Link } from "react-router-dom";

const actions = [
  { to: "/tavoli", title: "Sala", text: "Apri mappa e tavoli" },
  { to: "/cucina", title: "Cucina", text: "Monitor preparazioni" },
  { to: "/bar", title: "Bar", text: "Solo bevande" },
  { to: "/cassa", title: "Cassa", text: "Chiudi e incassa" },
  { to: "/admin", title: "Menu", text: "Modifica piatti" },
  { to: "/statistiche", title: "Report", text: "Analizza performance" },
];

export default function DashboardQuickActions() {
  return (
    <section className="dash-panel dash-quick-actions">
      <div className="dash-panel-head">
        <div>
          <span>Shortcut</span>
          <h2>Azioni rapide</h2>
        </div>
      </div>
      <div className="dash-action-grid">
        {actions.map((action) => (
          <Link to={action.to} key={action.to}>
            <b>{action.title}</b>
            <span>{action.text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
