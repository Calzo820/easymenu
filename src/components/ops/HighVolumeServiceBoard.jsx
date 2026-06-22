import { useMemo, useState } from "react";

const STATUS_LABELS = {
  pending: "Nuovi",
  in_progress: "In preparazione",
  ready: "Pronti",
};

function normalize(text) {
  return String(text || "").toLowerCase().trim();
}

function getItemName(item) {
  return item.nome || item.nameSnapshot || item.name || "Articolo";
}

function getItemQty(item) {
  return Number(item.qty ?? item.quantity ?? 1) || 1;
}

function formatTime(timestamp) {
  if (!timestamp) return "--:--";
  return new Date(timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function nextLabel(status, readyLabel) {
  if (status === "pending") return "Prendi";
  if (status === "in_progress") return readyLabel || "Pronto";
  return "Servito";
}

function ServiceOrderCard({ order, itemsKey, updating, onNext, onBack, onReadyAll, readyLabel }) {
  const items = order[itemsKey] || [];
  const status = order.status || order.stato || "pending";
  const minutes = order.timerMinuti ?? 0;
  const urgent = order.priorita >= 3 || minutes >= 8;

  return (
    <article className={`hv-order-card hv-status-${status} ${urgent ? "is-urgent" : ""}`}>
      <div className="hv-order-head">
        <div>
          <div className="hv-table">Tavolo {order.tavolo || "?"}</div>
          <div className="hv-meta">{formatTime(order.createdAt || order.time)} · {minutes} min · {items.length} righe</div>
        </div>
        <span className="hv-priority">{urgent ? "URGENTE" : (order.prioritaLabel || STATUS_LABELS[status] || "Attivo")}</span>
      </div>

      <div className="hv-items">
        {items.slice(0, 8).map((item, index) => (
          <div className="hv-item-row" key={`${order.id}-${item.id || index}`}>
            <b>{getItemQty(item)}×</b>
            <span>{getItemName(item)}</span>
            {(item.servizio || "subito") === "dopo" ? <em>Dopo</em> : null}
          </div>
        ))}
        {items.length > 8 ? <div className="hv-more">+{items.length - 8} altre righe</div> : null}
      </div>

      {order.notes || order.nota ? <div className="hv-note">Nota: {order.notes || order.nota}</div> : null}

      <div className="hv-actions">
        {status !== "pending" ? (
          <button className="hv-secondary" onClick={() => onBack(order.id, status)} disabled={updating}>Indietro</button>
        ) : null}
        <button className="hv-primary" onClick={() => onNext(order.id, status)} disabled={updating || status === "ready"}>
          {updating ? "..." : nextLabel(status, readyLabel)}
        </button>
        {status !== "ready" ? (
          <button className="hv-success" onClick={() => onReadyAll(order.id)} disabled={updating}>Tutto pronto</button>
        ) : null}
      </div>
    </article>
  );
}

export default function HighVolumeServiceBoard({
  title,
  subtitle,
  station = "cucina",
  loading,
  error,
  orders = [],
  itemsKey,
  totalItems = 0,
  newCount = 0,
  inProgressCount = 0,
  readyCount = 0,
  urgentCount = 0,
  updatingIds = [],
  onRefresh,
  onNext,
  onBack,
  onReadyAll,
  readyLabel,
}) {
  const [status, setStatus] = useState("active");
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState("comfortable");

  const filteredOrders = useMemo(() => {
    const q = normalize(query);
    return orders.filter((order) => {
      const orderStatus = order.status || order.stato || "pending";
      const items = order[itemsKey] || [];
      const searchable = `${order.tavolo || ""} ${items.map(getItemName).join(" ")} ${order.notes || ""}`;

      if (status === "new" && orderStatus !== "pending") return false;
      if (status === "progress" && orderStatus !== "in_progress") return false;
      if (status === "ready" && orderStatus !== "ready") return false;
      if (status === "urgent" && !(order.priorita >= 3 || order.timerMinuti >= 8)) return false;
      if (q && !normalize(searchable).includes(q)) return false;
      return true;
    });
  }, [orders, itemsKey, query, status]);

  const columns = useMemo(() => {
    const grouped = { pending: [], in_progress: [], ready: [] };
    filteredOrders.forEach((order) => {
      const s = order.status || order.stato || "pending";
      if (grouped[s]) grouped[s].push(order);
      else grouped.pending.push(order);
    });
    return grouped;
  }, [filteredOrders]);

  const visibleColumns = status === "active"
    ? ["pending", "in_progress", "ready"]
    : status === "new"
      ? ["pending"]
      : status === "progress"
        ? ["in_progress"]
        : status === "ready"
          ? ["ready"]
          : ["pending", "in_progress"];

  return (
    <main className={`hv-board hv-board-${station} hv-density-${density}`}>
      <section className="hv-commandbar">
        <div>
          <span className="hv-eyebrow">Postazione live</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="hv-command-actions">
          <button onClick={onRefresh}>Aggiorna</button>
          <button onClick={() => setDensity((d) => d === "compact" ? "comfortable" : "compact")}>{density === "compact" ? "Comoda" : "Compatta"}</button>
        </div>
      </section>

      {error ? <div className="hv-error">{error}</div> : null}

      <section className="hv-kpis" aria-label="Sintesi servizio">
        <div><span>Ordini</span><b>{orders.length}</b></div>
        <div><span>Articoli</span><b>{totalItems}</b></div>
        <div><span>Nuovi</span><b>{newCount}</b></div>
        <div><span>In prep</span><b>{inProgressCount}</b></div>
        <div><span>Pronti</span><b>{readyCount}</b></div>
        <div className={urgentCount ? "danger" : ""}><span>Urgenze</span><b>{urgentCount}</b></div>
      </section>

      <section className="hv-toolbar">
        <div className="hv-tabs">
          {[
            ["active", "Attivi"],
            ["urgent", "Urgenti"],
            ["new", "Nuovi"],
            ["progress", "In prep"],
            ["ready", "Pronti"],
          ].map(([value, label]) => (
            <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>
          ))}
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca tavolo o piatto..." />
      </section>

      {loading ? <div className="hv-empty">Caricamento ordini...</div> : null}

      {!loading && filteredOrders.length === 0 ? (
        <div className="hv-empty">Nessun ordine da gestire. La schermata è pronta per il prossimo servizio.</div>
      ) : null}

      {!loading && filteredOrders.length > 0 ? (
        <section className="hv-columns" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(280px, 1fr))` }}>
          {visibleColumns.map((column) => (
            <div className="hv-column" key={column}>
              <div className="hv-column-title">
                <b>{STATUS_LABELS[column]}</b>
                <span>{columns[column].length}</span>
              </div>
              <div className="hv-scroll-list">
                {columns[column].map((order) => (
                  <ServiceOrderCard
                    key={order.id}
                    order={order}
                    itemsKey={itemsKey}
                    updating={updatingIds.includes(order.id)}
                    onNext={onNext}
                    onBack={onBack}
                    onReadyAll={onReadyAll}
                    readyLabel={readyLabel}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
