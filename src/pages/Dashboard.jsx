import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiGet } from "../lib/api";
import { createRestaurantSocket, playOrderSound } from "../lib/realtime";

function euro(value) { return `€ ${Number(value || 0).toFixed(0)}`; }
function num(value) { return Number(value || 0); }
function getRestaurantName() {
  try { return JSON.parse(localStorage.getItem("auth_restaurant") || "null")?.name || localStorage.getItem("ristorante_attivo") || "Ristorante"; }
  catch { return localStorage.getItem("ristorante_attivo") || "Ristorante"; }
}
function stateLabel(status) {
  if (status === "pending") return "Nuovo";
  if (status === "in_progress") return "In cucina";
  if (status === "ready") return "Pronto";
  if (status === "served") return "Servito";
  return "Attivo";
}
function tableName(row) {
  return row?.table?.name || row?.tableName || row?.tableNumber || row?.table?.number || row?.tableId || "—";
}

function Kpi({ label, value, note }) {
  return <div className="em3-kpi"><span>{label}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</div>;
}
function Panel({ title, action, children }) {
  return <section className="em3-panel"><header><h2>{title}</h2>{action}</header>{children}</section>;
}
function Empty({ title, text }) { return <div className="em3-empty"><b>{title}</b><span>{text}</span></div>; }

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState("connessione...");
  const restaurantName = getRestaurantName();

  const load = useCallback(async () => {
    try {
      const result = await apiGet("/analytics/summary");
      setData(result);
      setError("");
    } catch (err) {
      setError(err.message || "Dashboard non disponibile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    const socket = createRestaurantSocket();
    socket.on("connect", () => setLive("live"));
    socket.on("disconnect", () => setLive("offline"));
    const refresh = () => { playOrderSound(); load(); };
    ["new-order", "new_order", "order-updated", "order_updated", "order-closed", "table-updated", "payment-updated", "error-logged"].forEach((event) => socket.on(event, refresh));
    return () => { clearInterval(timer); socket.disconnect(); };
  }, [load]);

  const kpis = data?.kpis || {};
  const liveData = data?.live || {};
  const charts = data?.charts || {};
  const alerts = data?.alerts || {};
  const activeOrders = useMemo(() => (liveData.activeOrders || liveData.openOrders || []).slice(0, 8), [liveData]);
  const tables = useMemo(() => (liveData.tables || liveData.activeTables || []).slice(0, 24), [liveData]);
  const topProducts = useMemo(() => (charts.topProductsToday || []).slice(0, 5), [charts]);

  return <main className="em3-app">
    <Navbar />
    <div className="em3-content">
      <section className="em3-hero em3-hero-owner">
        <div>
          <div className="em3-eyebrow"><span className={live === "live" ? "ok" : "warn"} /> Restaurant OS · {live}</div>
          <h1>{restaurantName}</h1>
          <p>La cabina di regia del servizio: vendite, tavoli, ordini e problemi reali. Nessun rumore.</p>
        </div>
        <div className="em3-hero-actions">
          <Link to="/tavoli">Apri sala</Link>
          <Link to="/cassa">Vai in cassa</Link>
          <button type="button" onClick={load}>Aggiorna</button>
        </div>
      </section>

      {error ? <div className="em3-alert">{error}</div> : null}
      {loading ? <div className="em3-panel">Caricamento...</div> : null}

      <section className="em3-kpi-grid">
        <Kpi label="Fatturato oggi" value={euro(kpis.revenueToday)} note="servizio corrente" />
        <Kpi label="Ordini attivi" value={kpis.openOrders || activeOrders.length || 0} note="da gestire ora" />
        <Kpi label="Tavoli occupati" value={`${kpis.activeTables || 0}/${kpis.totalTables || 0}`} note="sala" />
        <Kpi label="Ticket medio" value={euro(kpis.averageTicketToday)} note="oggi" />
      </section>

      <section className="em3-dashboard-grid">
        <Panel title="Ordini live" action={<Link to="/cucina">Cucina →</Link>}>
          {activeOrders.length ? <div className="em3-order-list">
            {activeOrders.map((order, index) => <div className="em3-live-row" key={order.id || index}>
              <div><b>Tavolo {tableName(order)}</b><span>{(order.items || order.orderItems || []).length} righe · {stateLabel(order.status)}</span></div>
              <strong>{euro(order.total || order.totalAmount)}</strong>
            </div>)}
          </div> : <Empty title="Nessun ordine aperto" text="Quando entra una comanda compare qui." />}
        </Panel>

        <Panel title="Mappa sala" action={<Link to="/tavoli">Sala →</Link>}>
          {tables.length ? <div className="em3-table-map">
            {tables.map((table, index) => <Link to="/cassa" className={`em3-table-dot ${table.status || table.state || "free"}`} key={table.id || index}>
              <b>{table.name || table.number || index + 1}</b><span>{table.statusLabel || table.status || "libero"}</span>
            </Link>)}
          </div> : <Empty title="Sala non caricata" text="Apri la pagina Sala per gestire tavoli e QR." />}
        </Panel>
      </section>

      <section className="em3-dashboard-grid secondary">
        <Panel title="Azioni rapide">
          <div className="em3-action-grid">
            <Link to="/cucina">Monitor cucina</Link>
            <Link to="/bar">Monitor bar</Link>
            <Link to="/admin">Modifica menu</Link>
            <Link to="/statistiche">Report</Link>
          </div>
        </Panel>

        <Panel title="Da controllare">
          <div className="em3-check-list">
            <div><span>Alert pagamenti</span><b>{kpis.paymentAlerts || alerts.paymentAlerts || 0}</b></div>
            <div><span>Errori aperti</span><b>{kpis.unresolvedErrors || alerts.unresolvedErrors || 0}</b></div>
            <div><span>Prodotti esauriti</span><b>{kpis.unavailableItems || 0}</b></div>
          </div>
        </Panel>

        <Panel title="Top prodotti">
          {topProducts.length ? <div className="em3-product-list">{topProducts.map((p) => <div key={p.id || p.name}><span>{p.name}</span><b>{num(p.quantity)}×</b></div>)}</div> : <Empty title="Nessuna vendita oggi" text="Qui vedrai cosa sta performando meglio." />}
        </Panel>
      </section>
    </div>
  </main>;
}
