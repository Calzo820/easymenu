import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";
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
  const h = Math.round(min / 60);
  return `${h} h fa`;
}

function KpiCard({ label, value, note, tone = "default" }) {
  const tones = {
    default: "linear-gradient(135deg,#ffffff 0%,#f8fafc 100%)",
    money: "linear-gradient(135deg,#ecfdf5 0%,#ffffff 100%)",
    warning: "linear-gradient(135deg,#fff7ed 0%,#ffffff 100%)",
    danger: "linear-gradient(135deg,#fef2f2 0%,#ffffff 100%)",
  };
  return (
    <div style={{ ...card, background: tones[tone] || tones.default }}>
      <div style={smallLabel}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: "-0.04em", marginTop: 8 }}>{value}</div>
      <div style={{ color: "#64748b", fontWeight: 750, marginTop: 8, fontSize: 13 }}>{note}</div>
    </div>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div className="panel-title">{title}</div>
          {subtitle ? <div className="panel-subtitle" style={{ marginTop: 5 }}>{subtitle}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function BarLine({ label, value, max, detail }) {
  const pct = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontWeight: 850, fontSize: 14 }}>
        <span>{label}</span>
        <span>{detail || value}</span>
      </div>
      <div style={{ height: 10, background: "#eef2f7", borderRadius: 999, overflow: "hidden", marginTop: 7 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#2563eb,#22c55e)", borderRadius: 999 }} />
      </div>
    </div>
  );
}

function QuickLink({ to, emoji, title, text }) {
  return (
    <Link to={to} style={{ ...card, textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{ fontSize: 30 }}>{emoji}</div>
      <div style={{ fontSize: 21, fontWeight: 950, marginTop: 10 }}>{title}</div>
      <div style={{ color: "#64748b", lineHeight: 1.5, fontSize: 14, marginTop: 7 }}>{text}</div>
      <div style={{ color: "#1d4ed8", fontWeight: 900, marginTop: 14 }}>Apri →</div>
    </Link>
  );
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
  const maxHourOrders = useMemo(() => Math.max(1, ...(charts.byHourToday || []).map((h) => num(h.orders))), [charts.byHourToday]);

  if (!restaurantName) {
    return (
      <div style={glowPageStyle}>
        <Navbar />
        <div style={appShellStyle}><div className="app-shell"><Panel title="Nessun ristorante attivo" subtitle="Accedi dall’area admin per continuare."><Link to="/admin" style={primaryBtn}>Vai all’area admin</Link></Panel></div></div>
      </div>
    );
  }

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div style={appShellStyle}>
        <div className="app-shell">
          {isSuperAdminMode ? (
            <div className="section-card" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", border: "2px solid #111827" }}>
              <div><b>Modalità Super Admin</b> · stai modificando questo ristorante con permessi completi.</div>
              <button
                type="button"
                onClick={() => {
                  const original = localStorage.getItem("superadmin_original_token");
                  if (original) localStorage.setItem("auth_token", original);
                  localStorage.removeItem("superadmin_mode");
                  localStorage.removeItem("superadmin_original_token");
                  window.location.href = "/super-admin";
                }}
                style={primaryBtn}
              >
                Torna a Super Admin
              </button>
            </div>
          ) : null}

          <div className="glass-hero" style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18, alignItems: "center" }}>
            <div>
              <div className="topbar-chip" style={{ marginBottom: 12 }}><span className="status-dot" style={{ background: liveBadge.includes("attivo") ? "#22c55e" : "#f59e0b" }} />Dashboard owner · {liveBadge}</div>
              <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.03, letterSpacing: "-0.05em" }}>{restaurantName}</h1>
              <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,.88)", fontSize: 16, lineHeight: 1.6, maxWidth: 760 }}>Fatturato, ordini completati, tavoli attivi, prodotti top, alert pagamenti e problemi tecnici in una sola schermata.</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
                <button onClick={() => load(true)} style={heroButton}>{refreshing ? "Aggiorno..." : "Aggiorna dashboard"}</button>
                <Link to="/qr" style={heroLink}>QR tavoli</Link>
                <Link to="/errori" style={heroLink}>Log errori</Link>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,.11)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 24, padding: 20, color: "white" }}>
              <div style={{ fontWeight: 950, fontSize: 20, marginBottom: 12 }}>Sala adesso</div>
              <HeroRow label="Tavoli attivi" value={kpis.activeTables || 0} />
              <HeroRow label="Tavoli liberi" value={kpis.freeTables || 0} />
              <HeroRow label="Ordini aperti" value={kpis.openOrders || 0} />
              <HeroRow label="Prodotti esauriti" value={kpis.unavailableItems || 0} />
            </div>
          </div>

          {error ? <div style={{ ...card, background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca", marginBottom: 16 }}>{error}</div> : null}
          {loading ? <div style={card}>Caricamento dashboard...</div> : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 16 }}>
            <KpiCard label="Fatturato oggi" value={euro(kpis.revenueToday)} note="ordini pagati/serviti" tone="money" />
            <KpiCard label="Ordini completati" value={kpis.completedOrdersToday || 0} note={`${kpis.ordersToday || 0} ordini totali oggi`} />
            <KpiCard label="Ticket medio" value={euro(kpis.averageTicketToday)} note="media su completati oggi" />
            <KpiCard label="Tavoli attivi" value={`${kpis.activeTables || 0}/${kpis.totalTables || 0}`} note="occupazione sala" />
            <KpiCard label="Alert pagamenti" value={kpis.paymentAlerts || 0} note="da controllare ultime 24h" tone={(kpis.paymentAlerts || 0) ? "danger" : "default"} />
            <KpiCard label="Errori aperti" value={kpis.unresolvedErrors || 0} note="log non risolti" tone={(kpis.unresolvedErrors || 0) ? "warning" : "default"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14, marginBottom: 16 }}>
            <QuickLink to="/cucina" emoji="👨‍🍳" title="Cucina" text="Piatti nuovi, in preparazione e pronti con aggiornamento live." />
            <QuickLink to="/bar" emoji="🥤" title="Bar" text="Solo bevande e comande bar separate dal flusso cucina." />
            <QuickLink to="/cassa" emoji="💳" title="Cassa" text="Chiusura tavoli, extra, sconti, pagamenti e storico." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16, marginBottom: 16, alignItems: "start" }}>
            <Panel title="Prodotti più venduti oggi" subtitle="Aiuta owner e staff a capire cosa spingere o preparare prima">
              {(charts.topProductsToday || []).length ? charts.topProductsToday.map((p) => (
                <BarLine key={p.id || p.name} label={p.name} value={num(p.quantity)} max={maxProductQty} detail={`${p.quantity} · ${euro(p.revenue)}`} />
              )) : <Empty text="Nessuna vendita oggi." />}
            </Panel>

            <Panel title="Ordini per ora" subtitle="Picchi di lavoro della giornata">
              {(charts.byHourToday || []).length ? charts.byHourToday.map((h) => (
                <BarLine key={h.hour} label={h.label} value={num(h.orders)} max={maxHourOrders} detail={`${h.orders} ordini · ${euro(h.revenue)}`} />
              )) : <Empty text="Ancora nessun ordine oggi." />}
            </Panel>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16, alignItems: "start" }}>
            <Panel title="Tavoli e ordini attivi" subtitle="Situazione live della sala">
              {(live.activeOrders || []).length ? live.activeOrders.map((order) => (
                <div key={order.id} style={rowBox}>
                  <div><b>#{order.orderNumber} · {order.table}</b><div style={muted}>{order.itemsCount} articoli · {timeAgo(order.createdAt)}</div></div>
                  <div style={{ textAlign: "right" }}><b>{euro(order.totalAmount)}</b><div style={statusPill}>{order.status}</div></div>
                </div>
              )) : <Empty text="Nessun ordine aperto." />}
            </Panel>

            <Panel title="Alert da controllare" subtitle="Esauriti, pagamenti sospesi ed errori">
              {(alerts.paymentAlerts || []).map((p) => <AlertRow key={p.id} tone="danger" title={`Pagamento ${p.status}`} text={`${p.table} · ${euro(p.amount)} · ${timeAgo(p.createdAt)}`} />)}
              {(alerts.recentErrors || []).map((e) => <AlertRow key={e.id} tone="warning" title={e.source} text={`${e.message} · ${timeAgo(e.createdAt)}`} />)}
              {(alerts.unavailableItems || []).map((i) => <AlertRow key={i.id} tone="info" title="Prodotto esaurito" text={`${i.name}${i.category ? ` · ${i.category}` : ""}`} />)}
              {!(alerts.paymentAlerts || []).length && !(alerts.recentErrors || []).length && !(alerts.unavailableItems || []).length ? <Empty text="Nessun alert aperto." /> : null}
            </Panel>
          </div>

          <Panel title="Accessi rapidi owner" subtitle="Gestione completa del ristorante">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <OwnerLink to="/admin" label="Gestione menu" />
              <OwnerLink to="/tavoli" label="Tavoli" />
              <OwnerLink to="/qr" label="Stampa QR" />
              <OwnerLink to="/statistiche" label="Statistiche" />
              <OwnerLink to="/storico" label="Storico ordini" />
              <OwnerLink to="/billing" label="Abbonamento" />
              <OwnerLink to="/errori" label="Log errori" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function HeroRow({ label, value }) {
  return <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.13)", padding: "10px 0" }}><span>{label}</span><b>{value}</b></div>;
}

function Empty({ text }) {
  return <div style={{ padding: 16, borderRadius: 16, background: "#f8fafc", color: "#64748b", fontWeight: 750 }}>{text}</div>;
}

function AlertRow({ title, text, tone }) {
  const colors = { danger: "#ef4444", warning: "#f59e0b", info: "#2563eb" };
  return <div style={rowBox}><div style={{ width: 10, height: 10, borderRadius: 999, background: colors[tone] || colors.info }} /><div><b>{title}</b><div style={muted}>{text}</div></div></div>;
}

function OwnerLink({ to, label }) {
  return <Link to={to} style={{ padding: "14px 16px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e5e7eb", textDecoration: "none", color: "#111827", fontWeight: 900 }}>{label} →</Link>;
}

const card = { background: "rgba(255,255,255,.94)", border: "1px solid rgba(255,255,255,.75)", borderRadius: 24, padding: 18, boxShadow: "0 18px 36px rgba(15,23,42,.07)" };
const smallLabel = { color: "#64748b", fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em" };
const muted = { color: "#64748b", fontSize: 13, marginTop: 4, fontWeight: 700 };
const rowBox = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #eef2f7" };
const statusPill = { marginTop: 5, display: "inline-block", padding: "4px 9px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 900 };
const primaryBtn = { display: "inline-block", textDecoration: "none", borderRadius: 14, padding: "12px 16px", background: "#111827", color: "white", fontWeight: 900 };
const heroButton = { border: "0", borderRadius: 16, padding: "14px 18px", background: "linear-gradient(135deg,#22c55e,#10b981)", color: "white", fontWeight: 950, cursor: "pointer", boxShadow: "0 16px 26px rgba(16,185,129,.22)" };
const heroLink = { textDecoration: "none", borderRadius: 16, padding: "14px 18px", background: "rgba(255,255,255,.11)", border: "1px solid rgba(255,255,255,.16)", color: "white", fontWeight: 950 };

export default Dashboard;
