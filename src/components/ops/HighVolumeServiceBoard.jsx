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

function getItemService(item) {
  return (item.servizio || item.service || "subito") === "dopo" ? "dopo" : "subito";
}

function formatTime(timestamp) {
  if (!timestamp) return "--:--";
  return new Date(timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  return `${Math.max(0, value)} min`;
}

function nextLabel(status, readyLabel) {
  if (status === "pending") return "Prendi";
  if (status === "in_progress") return readyLabel || "Pronto";
  return "Al pass";
}

function slaClass(minutes, status) {
  if (status === "ready") return "ready";
  if (minutes >= 18) return "late";
  if (minutes >= 10) return "warn";
  return "ok";
}

function buildBatchGroups(orders, itemsKey) {
  const groups = new Map();

  orders.forEach((order) => {
    const items = order[itemsKey] || [];
    items.forEach((item) => {
      const name = getItemName(item);
      const service = getItemService(item);
      const key = `${normalize(name)}:${service}`;
      const current = groups.get(key) || {
        key,
        name,
        service,
        qty: 0,
        tables: new Set(),
        oldest: 0,
        urgent: 0,
      };

      current.qty += getItemQty(item);
      current.tables.add(order.tavolo || "?");
      current.oldest = Math.max(current.oldest, order.timerMinuti || 0);
      if ((order.priorita || 0) >= 3 || (order.timerMinuti || 0) >= 8) current.urgent += 1;
      groups.set(key, current);
    });
  });

  return [...groups.values()]
    .map((group) => ({ ...group, tables: [...group.tables].slice(0, 5) }))
    .sort((a, b) => {
      if (b.urgent !== a.urgent) return b.urgent - a.urgent;
      if (b.qty !== a.qty) return b.qty - a.qty;
      return b.oldest - a.oldest;
    })
    .slice(0, 6);
}

function ServiceOrderCard({ order, itemsKey, updating, onNext, onBack, onReadyAll, readyLabel }) {
  const items = order[itemsKey] || [];
  const status = order.status || order.stato || "pending";
  const minutes = order.timerMinuti ?? 0;
  const urgent = order.priorita >= 3 || minutes >= 8;
  const subitoCount = items
    .filter((item) => getItemService(item) === "subito")
    .reduce((sum, item) => sum + getItemQty(item), 0);
  const dopoCount = items
    .filter((item) => getItemService(item) === "dopo")
    .reduce((sum, item) => sum + getItemQty(item), 0);

  return (
    <article className={`hv-order-card hv-status-${status} ${urgent ? "is-urgent" : ""}`}>
      <div className="hv-order-head">
        <div>
          <div className="hv-table">Tavolo {order.tavolo || "?"}</div>
          <div className="hv-meta">
            {formatTime(order.createdAt || order.time)} - {formatMinutes(minutes)} - {items.length} righe
          </div>
        </div>
        <span className={`hv-sla hv-sla-${slaClass(minutes, status)}`}>
          {urgent ? "URGENTE" : order.prioritaLabel || STATUS_LABELS[status] || "Attivo"}
        </span>
      </div>

      <div className="hv-order-signal">
        <span>Subito <b>{subitoCount}</b></span>
        <span>Dopo <b>{dopoCount}</b></span>
        <span>Pezzi <b>{order.totaleArticoli || subitoCount + dopoCount}</b></span>
      </div>

      <div className="hv-items">
        {items.slice(0, 8).map((item, index) => (
          <div className="hv-item-row" key={`${order.id}-${item.id || index}`}>
            <b>{getItemQty(item)}x</b>
            <span>{getItemName(item)}</span>
            {item.categoria ? <small>{item.categoria}</small> : null}
            {getItemService(item) === "dopo" ? <em>Dopo</em> : null}
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
      const searchable = [
        order.tavolo,
        order.notes,
        order.nota,
        ...items.map(getItemName),
        ...items.map((item) => item.categoria || ""),
      ].join(" ");

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
      const orderStatus = order.status || order.stato || "pending";
      if (grouped[orderStatus]) grouped[orderStatus].push(order);
      else grouped.pending.push(order);
    });
    return grouped;
  }, [filteredOrders]);

  const batchGroups = useMemo(() => buildBatchGroups(filteredOrders, itemsKey), [filteredOrders, itemsKey]);
  const oldestMinutes = filteredOrders.reduce((max, order) => Math.max(max, order.timerMinuti || 0), 0);
  const activeLoad = filteredOrders.reduce(
    (sum, order) => sum + (order[itemsKey] || []).reduce((itemSum, item) => itemSum + getItemQty(item), 0),
    0
  );

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
      <section className="hv-compact-topbar">
        <div>
          <div className="hv-compact-title">
            <span>{title}</span>
            <b>{newCount}</b><small>nuovi</small>
            <b>{inProgressCount}</b><small>in prep</small>
            <b>{readyCount}</b><small>pronti</small>
            <b>{activeLoad}</b><small>pezzi</small>
            {urgentCount ? <em>{urgentCount} urgenti</em> : null}
          </div>
          {subtitle ? <p className="hv-compact-subtitle">{subtitle}</p> : null}
        </div>
        <div className="hv-compact-actions">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca tavolo, piatto o nota..." />
          <button onClick={onRefresh}>Aggiorna</button>
          <button onClick={() => setDensity((d) => d === "compact" ? "comfortable" : "compact")}>
            {density === "compact" ? "Comoda" : "Compatta"}
          </button>
        </div>
      </section>

      {error ? <div className="hv-error">{error}</div> : null}

      <section className="hv-pass-strip">
        <div className="hv-pass-kpis">
          <div><span>Attesa max</span><b>{formatMinutes(oldestMinutes)}</b></div>
          <div><span>Al pass</span><b>{columns.ready.length}</b></div>
          <div><span>Carico</span><b>{activeLoad}</b></div>
        </div>
        <div className="hv-batch-rail">
          <div className="hv-batch-title">Batch piatti</div>
          {batchGroups.length ? (
            batchGroups.map((group) => (
              <div className={`hv-batch-chip ${group.urgent ? "is-hot" : ""}`} key={group.key}>
                <strong>{group.qty}x {group.name}</strong>
                <span>{group.service === "dopo" ? "Dopo" : "Subito"} - T {group.tables.join(", ")} - {formatMinutes(group.oldest)}</span>
              </div>
            ))
          ) : (
            <div className="hv-batch-empty">Nessun batch attivo</div>
          )}
        </div>
      </section>

      <section className="hv-toolbar hv-toolbar-tight">
        <div className="hv-tabs">
          {[
            ["active", `Tutti ${orders.length}`],
            ["urgent", `Urgenti ${urgentCount}`],
            ["new", `Nuovi ${newCount}`],
            ["progress", `In prep ${inProgressCount}`],
            ["ready", `Pronti ${readyCount}`],
          ].map(([value, label]) => (
            <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>
          ))}
        </div>
      </section>

      {loading ? <div className="hv-empty">Caricamento ordini...</div> : null}

      {!loading && filteredOrders.length === 0 ? (
        <div className="hv-empty">Nessun ordine da gestire. La schermata e pronta per il prossimo servizio.</div>
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
