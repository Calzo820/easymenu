import DashboardEmptyState from "./DashboardEmptyState.jsx";

function euro(value) {
  if (value === null || value === undefined) return "importo nascosto";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
}

export default function DashboardTopProducts({ products = [] }) {
  const max = Math.max(1, ...products.map((p) => Number(p.quantity) || 0));
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <span>Menu intelligence</span>
          <h2>Top prodotti oggi</h2>
        </div>
      </div>
      {products.length ? (
        <div className="dash-bars">
          {products.slice(0, 6).map((product) => {
            const pct = Math.max(6, Math.min(100, ((Number(product.quantity) || 0) / max) * 100));
            return (
              <div className="dash-bar-row" key={product.id || product.name}>
                <div><b>{product.name}</b><span>{product.quantity} venduti - {euro(product.revenue)}</span></div>
                <div className="dash-bar-track"><i style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      ) : (
        <DashboardEmptyState title="Nessuna vendita" text="I prodotti più venduti compariranno durante il turno." />
      )}
    </section>
  );
}
