import { useMemo, useState } from "react";

const STATUS_COLUMNS = [
  { key: "pending", label: "Nuovi", empty: "Nessuna nuova comanda" },
  { key: "in_progress", label: "In preparazione", empty: "Niente in lavorazione" },
  { key: "ready", label: "Pronti", empty: "Niente al pass" },
];

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
  const value = Math.max(0, Number(minutes || 0));
  return `${value} min`;
}

function getOrderStatus(order) {
  return order.status || order.stato || "pending";
}

function getActionLabel(status, readyLabel) {
  if (status === "pending") return "Prendi";
  if (status === "in_progress") return readyLabel || "Pronto";
  return "Al pass";
}

function getSlaTone(minutes, status) {
  if (status === "ready") return "ready";
  if (minutes >= 18) return "late";
  if (minutes >= 10) return "warn";
  return "ok";
}

function serviceSummary(items) {
  const subito = items
    .filter((item) => getItemService(item) === "subito")
    .reduce((sum, item) => sum + getItemQty(item), 0);
  const dopo = items
    .filter((item) => getItemService(item) === "dopo")
    .reduce((sum, item) => sum + getItemQty(item), 0);

  if (dopo > 0 && subito > 0) return `${subito} subito · ${dopo} dopo`;
  if (dopo > 0) return `${dopo} dopo`;
  return `${subito || items.length} subito`;
}

function ServiceOrderCard({ order, itemsKey, updating, onNext, onBack, readyLabel }) {
  const items = order[itemsKey] || [];
  const status = getOrderStatus(order);
  const minutes = order.timerMinuti ?? 0;
  const urgent = order.priorita >= 3 || minutes >= 8;
  const canGoNext = status === "pending" || status === "in_progress";
  const tableLabel = order.tavolo || order.table?.code || order.table?.name || "?";

  return (
    <article className={`kds-ticket kds-ticket--${status} ${urgent ? "is-urgent" : ""}`}>
      <header className="kds-ticket__head">
        <div>
          <strong>Tavolo {tableLabel}</strong>
          <span>{formatTime(order.createdAt || order.time)} · {formatMinutes(minutes)} · {serviceSummary(items)}</span>
        </div>
        <b className={`kds-ticket__sla kds-ticket__sla--${getSlaTone(minutes, status)}`}>
          {urgent ? "URGENTE" : status === "ready" ? "PRONTO" : `${minutes}'`}
        </b>
      </header>

      <div className="kds-ticket__items">
        {items.slice(0, 10).map((item, index) => (
          <div className="kds-ticket__item" key={`${order.id}-${item.id || index}`}>
            <b>{getItemQty(item)}×</b>
            <span>{getItemName(item)}</span>
            {getItemService(item) === "dopo" ? <em>Dopo</em> : null}
            {item.notes || item.nota || item.notaPiatto ? <small>{item.notes || item.nota || item.notaPiatto}</small> : null}
          </div>
        ))}
        {items.length > 10 ? <div className="kds-ticket__more">+{items.length - 10} altri articoli</div> : null}
      </div>

      {order.notes || order.nota ? <div className="kds-ticket__note">{order.notes || order.nota}</div> : null}

      <footer className="kds-ticket__actions">
        {status !== "pending" ? (
          <button className="kds-ticket__ghost" type="button" onClick={() => onBack(order.id, status)} disabled={updating}>
            Indietro
          </button>
        ) : null}
        <button className="kds-ticket__primary" type="button" onClick={() => onNext(order.id, status)} disabled={updating || !canGoNext}>
          {updating ? "..." : getActionLabel(status, readyLabel)}
        </button>
      </footer>
    </article>
  );
}

export default function HighVolumeServiceBoard({
  title,
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
  readyLabel,
}) {
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("all");
  const [dense, setDense] = useState(true);

  const filteredOrders = useMemo(() => {
    const q = normalize(query);
    return orders.filter((order) => {
      const status = getOrderStatus(order);
      const items = order[itemsKey] || [];
      const searchable = [
        order.tavolo,
        order.notes,
        order.nota,
        ...items.map(getItemName),
        ...items.map((item) => item.categoria || item.categorySnapshot || ""),
      ].join(" ");

      if (focus !== "all" && status !== focus) return false;
      if (q && !normalize(searchable).includes(q)) return false;
      return true;
    });
  }, [orders, itemsKey, query, focus]);

  const columns = useMemo(() => {
    const grouped = { pending: [], in_progress: [], ready: [] };
    filteredOrders.forEach((order) => {
      const status = getOrderStatus(order);
      if (grouped[status]) grouped[status].push(order);
      else grouped.pending.push(order);
    });
    return grouped;
  }, [filteredOrders]);

  const activeItems = orders.reduce((sum, order) => {
    return sum + (order[itemsKey] || []).reduce((itemSum, item) => itemSum + getItemQty(item), 0);
  }, 0);

  return (
    <main className={`kds-board kds-board--${station} ${dense ? "is-dense" : ""}`}>
      <section className="kds-topbar">
        <button className="kds-topbar__station" type="button" onClick={onRefresh}>
          <span>{title}</span>
          <small>Live</small>
        </button>

        <div className="kds-topbar__stats" aria-label="Stato servizio">
          <button type="button" className={focus === "all" ? "is-active" : ""} onClick={() => setFocus("all")}><b>{orders.length}</b><span>attivi</span></button>
          <button type="button" className={focus === "pending" ? "is-active" : ""} onClick={() => setFocus("pending")}><b>{newCount}</b><span>nuovi</span></button>
          <button type="button" className={focus === "in_progress" ? "is-active" : ""} onClick={() => setFocus("in_progress")}><b>{inProgressCount}</b><span>prep</span></button>
          <button type="button" className={focus === "ready" ? "is-active" : ""} onClick={() => setFocus("ready")}><b>{readyCount}</b><span>pronti</span></button>
          <div className={urgentCount ? "is-hot" : ""}><b>{urgentCount}</b><span>urgenze</span></div>
          <div><b>{activeItems}</b><span>pezzi</span></div>
        </div>

        <div className="kds-topbar__tools">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca tavolo o piatto" />
          <button type="button" onClick={() => setDense((value) => !value)}>{dense ? "Comoda" : "Densa"}</button>
        </div>
      </section>

      {error ? <div className="kds-error">{error}</div> : null}
      {loading ? <div className="kds-empty">Caricamento comande...</div> : null}

      {!loading && filteredOrders.length === 0 ? (
        <div className="kds-empty">Nessuna comanda da gestire.</div>
      ) : null}

      {!loading && filteredOrders.length > 0 ? (
        <section className="kds-columns">
          {STATUS_COLUMNS.map((column) => (
            <div className={`kds-column kds-column--${column.key}`} key={column.key}>
              <div className="kds-column__head">
                <strong>{column.label}</strong>
                <span>{columns[column.key].length}</span>
              </div>
              <div className="kds-column__list">
                {columns[column.key].length ? (
                  columns[column.key].map((order) => (
                    <ServiceOrderCard
                      key={order.id}
                      order={order}
                      itemsKey={itemsKey}
                      updating={updatingIds.includes(order.id)}
                      onNext={onNext}
                      onBack={onBack}
                      readyLabel={readyLabel}
                    />
                  ))
                ) : (
                  <div className="kds-column__empty">{column.empty}</div>
                )}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
