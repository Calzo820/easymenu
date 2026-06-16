import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import CommandDock from "../components/CommandDock";
import { glowPageStyle } from "../styles/pageStyles";
import { apiGet } from "../lib/api";
import { createRestaurantSocket, playOrderSound } from "../lib/realtime";

function getRestaurantName() {
  try {
    const restaurant = JSON.parse(localStorage.getItem("auth_restaurant") || "null");
    return restaurant?.name || localStorage.getItem("ristorante_attivo") || "";
  } catch {
    return localStorage.getItem("ristorante_attivo") || "";
  }
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function euro(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(num(value));
}

function timeAgo(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.max(0, Math.round(diff / 60000));
  if (min < 1) return "adesso";
  if (min < 60) return `${min} min fa`;
  return `${Math.round(min / 60)} h fa`;
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [liveBadge, setLiveBadge] = useState("connessione live...");
  const restaurantName = getRestaurantName();
  const isSuperAdminMode = localStorage.getItem("superadmin_mode") === "1";

  const load = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      const result = await apiGet("/analytics/summary");
      setData(result);
      setError("");
    } catch (err) {
      setError(err.message || "Errore caricamento dashboard owner");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const fallback = setInterval(() => load(), 30000);
    const socket = createRestaurantSocket();

    socket.on("connect", () => setLiveBadge("live attivo"));
    socket.on("disconnect", () => setLiveBadge("live disconnesso"));
    const refreshWithSound = () => {
      playOrderSound();
      load();
    };
    socket.on("new-order", refreshWithSound);
    socket.on("new_order", refreshWithSound);
    socket.on("order-updated", () => load());
    socket.on("order_updated", () => load());
    socket.on("order-closed", () => load());
    socket.on("order-deleted", () => load());
    socket.on("table-updated", () => load());
    socket.on("payment-updated", () => load());
    socket.on("payment_updated", () => load());
    socket.on("error-logged", () => load());
    socket.on("error_logged", () => load());

    return () => {
      clearInterval(fallback);
      socket.disconnect();
    };
  }, [load]);

  const kpis = data?.kpis || {};
  const live = data?.live || {};
  const charts = data?.charts || {};
  const alerts = data?.alerts || {};

  const maxProductQty = useMemo(() => Math.max(1, ...(charts.topProductsToday || []).map((p) => num(p.quantity))), [charts.topProductsToday]);

  if (!restaurantName) {
    return (
      <div style={glowPageStyle}>
        <Navbar />
        <main className="em-v2-shell">
          <div className="em-panel">
            <h2>Nessun ristorante attivo</h2>
            <p>Accedi dall’area admin o seleziona un ristorante dal superadmin.</p>
            <Link to="/admin" className="em-primary-btn" style={{ marginTop: 14 }}>Vai all’area admin</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <main className="em-v2-shell em-v2-tight">
        <CommandDock />

        {isSuperAdminMode ? (
          <div className="em-panel" style={{ border: "2px solid #111827" }}>
            <div className="em-list-row">
              <div><b>Modalità Super Admin</b><br /><small>Stai modificando questo ristorante con permessi completi.</small></div>
              <button
                type="button"
                className="em-primary-btn"
                onClick={() => {
                  const original = localStorage.getItem("superadmin_original_token");
                  if (original) localStorage.setItem("auth_token", original);
                  localStorage.removeItem("superadmin_mode");
                  localStorage.removeItem("superadmin_original_token");
                  window.location.href = "/super-admin";
                }}
              >
                Torna a Super Admin
              </button>
            </div>
          </div>
        ) : null}

        <section className="em-owner-hero">
          <div className="em-hero-card">
            <div className="em-chip"><span className="em-dot" style={{ background: liveBadge.includes("attivo") ? "#22c55e" : "#f59e0b" }} />Sistema operativo ristorante · {liveBadge}</div>
            <h1 className="em-hero-title">Oggi, {restaurantName}</h1>
            <p className="em-hero-sub">Una sola cabina di regia: cosa sta succedendo ora, cosa richiede attenzione e dove deve andare lo staff.</p>
            <div className="em-hero-actions">
              <button onClick={() => load(true)} className="em-primary-btn">{refreshing ? "Aggiorno..." : "Aggiorna"}</button>
              <Link to="/cucina" className="em-ghost-btn">Apri cucina</Link>
              <Link to="/cassa" className="em-ghost-btn">Apri cassa</Link>
            </div>
          </div>

          <div className="em-service-board em-hero-card" style={{ background: "rgba(255,255,255,.94)", color: "#0f172a" }}>
            <ServiceRow label="Tavoli attivi" value={kpis.activeTables || 0} hint={`${kpis.freeTables || 0} liberi`} />
            <ServiceRow label="Ordini aperti" value={kpis.openOrders || 0} hint="da seguire live" />
            <ServiceRow label="Pagamenti alert" value={kpis.paymentAlerts || 0} hint="controllo cassa" />
            <ServiceRow label="Prodotti esauriti" value={kpis.unavailableItems || 0} hint="menu da aggiornare" />
          </div>
        </section>

        {error ? <div className="em-panel" style={{ background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" }}>{error}</div> : null}
        {loading ? <div className="em-panel">Caricamento dashboard...</div> : null}

        <section className="em-kpi-grid">
          <Kpi label="Incasso oggi" value={euro(kpis.revenueToday)} note="pagato o servito" />
          <Kpi label="Ordini completati" value={kpis.completedOrdersToday || 0} note={`${kpis.ordersToday || 0} ordini totali`} />
          <Kpi label="Ticket medio" value={euro(kpis.averageTicketToday)} note="utile per margine" />
          <Kpi label="Sala" value={`${kpis.activeTables || 0}/${kpis.totalTables || 0}`} note="occupazione tavoli" />
        </section>

        <section className="em-work-grid">
          <WorkCard to="/tavoli" icon="🍽️" title="Sala" text="Vista tavoli, stato comande, priorità e tavoli da liberare." cta="Gestisci sala" />
          <WorkCard to="/cucina" icon="👨‍🍳" title="Cucina" text="Monitor operativo per nuovi ordini, preparazione e pronto sala." cta="Apri monitor" />
          <WorkCard to="/cassa" icon="💳" title="Cassa" text="Chiudi conti, applica sconti, stampa e controlla pagamenti." cta="Vai al POS" />
        </section>

        <section className="em-two-cols">
          <div>
            <Panel title="Priorità operative" subtitle="Le prime cose da guardare durante il servizio">
              {(live.activeOrders || []).slice(0, 7).map((order) => (
                <div className="em-list-row" key={order.id}>
                  <div>
                    <b>#{order.orderNumber} · {order.table}</b><br />
                    <small>{order.itemsCount} articoli · {timeAgo(order.createdAt)}</small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <b>{euro(order.totalAmount)}</b><br />
                    <span className="em-pill">{order.status}</span>
                  </div>
                </div>
              ))}
              {!(live.activeOrders || []).length ? <Empty text="Nessun ordine aperto: sala pulita." /> : null}
            </Panel>

            <Panel title="Prodotti da spingere/preparare" subtitle="Top vendite di oggi, utile anche per mise en place">
              {(charts.topProductsToday || []).slice(0, 8).map((p) => (
                <BarLine key={p.id || p.name} label={p.name} value={num(p.quantity)} max={maxProductQty} detail={`${p.quantity} · ${euro(p.revenue)}`} />
              ))}
              {!(charts.topProductsToday || []).length ? <Empty text="Ancora nessuna vendita oggi." /> : null}
            </Panel>
          </div>

          <aside>
            <Panel title="Alert" subtitle="Solo ciò che richiede una decisione">
              {(alerts.paymentAlerts || []).slice(0, 4).map((p) => <AlertRow key={p.id} tone="red" title={`Pagamento ${p.status}`} text={`${p.table} · ${euro(p.amount)} · ${timeAgo(p.createdAt)}`} />)}
              {(alerts.recentErrors || []).slice(0, 4).map((e) => <AlertRow key={e.id} tone="orange" title={e.source} text={`${e.message} · ${timeAgo(e.createdAt)}`} />)}
              {(alerts.unavailableItems || []).slice(0, 6).map((i) => <AlertRow key={i.id} tone="blue" title="Prodotto esaurito" text={`${i.name}${i.category ? ` · ${i.category}` : ""}`} />)}
              {!(alerts.paymentAlerts || []).length && !(alerts.recentErrors || []).length && !(alerts.unavailableItems || []).length ? <Empty text="Nessun alert aperto." /> : null}
            </Panel>

            <Panel title="Setup rapido" subtitle="Le impostazioni che servono davvero">
              <div style={{ display: "grid", gap: 9 }}>
                <OwnerLink to="/admin" label="Menu e disponibilità" />
                <OwnerLink to="/tavoli" label="Tavoli e sala" />
                <OwnerLink to="/qr" label="QR da stampare" />
                <OwnerLink to="/statistiche" label="Analisi complete" />
                <OwnerLink to="/billing" label="Abbonamento" />
              </div>
            </Panel>
          </aside>
        </section>
      </main>
    </div>
  );
}

function ServiceRow({ label, value, hint }) {
  return <div className="em-service-row"><div><b>{label}</b><br /><span>{hint}</span></div><strong>{value}</strong></div>;
}

function Kpi({ label, value, note }) {
  return <div className="em-kpi"><small>{label}</small><strong>{value}</strong><span>{note}</span></div>;
}

function WorkCard({ to, icon, title, text, cta }) {
  return (
    <Link to={to} className="em-work-card">
      <div className="em-work-card__icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="em-work-card__footer"><span>{cta}</span><span>→</span></div>
    </Link>
  );
}

function Panel({ title, subtitle, children }) {
  return <div className="em-panel"><div className="em-panel-head"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></div>{children}</div>;
}

function Empty({ text }) {
  return <div className="em-empty">{text}</div>;
}

function AlertRow({ title, text, tone }) {
  const colors = { red: "#ef4444", orange: "#f59e0b", blue: "#2563eb" };
  return <div className="em-list-row" style={{ justifyContent: "flex-start" }}><span style={{ width: 10, height: 10, borderRadius: 999, background: colors[tone] || colors.blue, flex: "0 0 auto" }} /><div><b>{title}</b><br /><small>{text}</small></div></div>;
}

function BarLine({ label, value, max, detail }) {
  const pct = max > 0 ? Math.max(5, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontWeight: 900, fontSize: 14 }}><span>{label}</span><span>{detail || value}</span></div>
      <div style={{ height: 10, background: "#eef2f7", borderRadius: 999, overflow: "hidden", marginTop: 7 }}><div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#2563eb,#22c55e)", borderRadius: 999 }} /></div>
    </div>
  );
}

function OwnerLink({ to, label }) {
  return <Link to={to} style={{ padding: "13px 14px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e5e7eb", textDecoration: "none", color: "#111827", fontWeight: 950 }}>{label} →</Link>;
}

export default Dashboard;
