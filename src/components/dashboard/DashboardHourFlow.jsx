import DashboardEmptyState from "./DashboardEmptyState.jsx";

export default function DashboardHourFlow({ hours = [] }) {
  const max = Math.max(1, ...hours.map((h) => Number(h.orders) || 0));
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <span>Ritmo servizio</span>
          <h2>Picchi orari</h2>
        </div>
      </div>
      {hours.length ? (
        <div className="dash-hour-flow">
          {hours.slice(-10).map((hour) => {
            const height = Math.max(12, Math.min(96, ((Number(hour.orders) || 0) / max) * 96));
            return (
              <div className="dash-hour" key={hour.hour || hour.label} title={`${hour.orders} ordini`}>
                <i style={{ height }} />
                <span>{hour.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <DashboardEmptyState title="Giornata appena iniziata" text="Qui vedrai gli orari piu intensi." />
      )}
    </section>
  );
}
