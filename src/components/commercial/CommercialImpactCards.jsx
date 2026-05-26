import { formatCurrency, formatPercent, getImpactTone } from "../../lib/commercialImpact";

export function MetricCard({ label, value, note, accent = "blue" }) {
  return (
    <div className={`commercial-card metric-${accent}`}>
      <span className="commercial-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export function ActionCard({ action, index }) {
  return (
    <article className="commercial-action-card">
      <div className="commercial-action-rank">{String(index + 1).padStart(2, "0")}</div>
      <div>
        <div className="commercial-action-meta">
          <span className={getImpactTone(action.impact)}>Impatto {action.impact}</span>
          <span>Sforzo {action.effort}</span>
          <span>{action.type}</span>
        </div>
        <h3>{action.title}</h3>
        <p>{action.detail}</p>
        <div className="commercial-action-next">{action.action}</div>
      </div>
    </article>
  );
}

export function ProductPowerList({ products = [] }) {
  if (!products.length) return <div className="commercial-empty">Nessun prodotto venduto nel periodo selezionato.</div>;

  const max = Math.max(...products.map((item) => Number(item.quantity) || 0), 1);

  return (
    <div className="commercial-list">
      {products.map((product) => (
        <div className="commercial-row" key={product.id || product.name}>
          <div className="commercial-row-head">
            <strong>#{product.rank} {product.name}</strong>
            <span>{product.quantity} venduti · {formatCurrency(product.revenue)}</span>
          </div>
          <div className="commercial-progress"><i style={{ width: `${Math.max(6, ((Number(product.quantity) || 0) / max) * 100)}%` }} /></div>
          <small>{formatPercent(product.mixShare)} del mix · {product.recommendation}</small>
        </div>
      ))}
    </div>
  );
}

export function PeakHours({ hours = [] }) {
  if (!hours.length) return <div className="commercial-empty">Ancora nessuna fascia oraria significativa.</div>;

  return (
    <div className="commercial-hour-grid">
      {hours.map((hour) => (
        <div className="commercial-hour" key={hour.hour}>
          <strong>{hour.label}</strong>
          <span>{formatCurrency(hour.revenue)}</span>
          <small>{hour.orders} ordini · ticket {formatCurrency(hour.averageTicket)}</small>
        </div>
      ))}
    </div>
  );
}

export function TableRanking({ tables = [] }) {
  if (!tables.length) return <div className="commercial-empty">Nessun tavolo con vendite pagate nel periodo.</div>;

  return (
    <div className="commercial-list compact">
      {tables.map((table, index) => (
        <div className="commercial-table-row" key={table.id}>
          <span>{index + 1}</span>
          <div>
            <strong>{table.name}</strong>
            <small>{table.zone || "Sala"} · {table.orders} ordini</small>
          </div>
          <b>{formatCurrency(table.revenue)}</b>
        </div>
      ))}
    </div>
  );
}
