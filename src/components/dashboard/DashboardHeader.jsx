export default function DashboardHeader({ restaurantName, liveBadge, refreshing, onRefresh }) {
  const live = liveBadge?.includes("attivo");
  return (
    <header className="dash-hero-pro">
      <div>
        <div className="dash-eyebrow">
          <span className={live ? "dash-live-dot" : "dash-live-dot dash-live-dot--warn"} /> EasyMenu live - {liveBadge}
        </div>
        <h1>{restaurantName}</h1>
        <p>Solo le priorità del turno: ordini aperti, sala, cassa e setup essenziale. Meno pagine da studiare, più servizio da gestire.</p>
      </div>
      <div className="dash-hero-actions">
        <button type="button" onClick={onRefresh}>{refreshing ? "Aggiorno..." : "Aggiorna"}</button>
      </div>
    </header>
  );
}
