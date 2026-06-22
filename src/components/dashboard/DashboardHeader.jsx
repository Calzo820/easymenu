import { Link } from "react-router-dom";

export default function DashboardHeader({ restaurantName, liveBadge, refreshing, onRefresh }) {
  const live = liveBadge?.includes("attivo");
  return (
    <header className="dash-hero-pro">
      <div>
        <div className="dash-eyebrow"><span className={live ? "dash-live-dot" : "dash-live-dot dash-live-dot--warn"} /> Restaurant OS · {liveBadge}</div>
        <h1>{restaurantName}</h1>
        <p>Il turno di oggi in una sola schermata: ordini, tavoli, incasso e problemi da risolvere. Meno pagine, più controllo.</p>
      </div>
      <div className="dash-hero-actions">
        <button type="button" onClick={onRefresh}>{refreshing ? "Aggiorno..." : "Aggiorna"}</button>
        <Link to="/tavoli">Apri sala</Link>
        <Link to="/cassa">Vai alla cassa</Link>
      </div>
    </header>
  );
}
