import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiGet } from "../lib/api";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";
import "../styles/management-os.css";

function getRestaurantName() {
  try {
    return JSON.parse(localStorage.getItem("auth_restaurant") || "null")?.name || localStorage.getItem("ristorante_attivo") || "Ristorante";
  } catch {
    return localStorage.getItem("ristorante_attivo") || "Ristorante";
  }
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(number(value));
}

function normalizedOrder(order) {
  return {
    ...order,
    closedAt: order.closedAt || order.servedAt || order.updatedAt || order.createdAt,
    total: number(order.totalAmount ?? order.totale),
    payment: order.paymentMethod || order.pagamento || "Non indicato",
    items: (order.items || order.piatti || []).map((item) => ({
      name: item.nameSnapshot || item.nome || item.menuItem?.name || "Articolo",
      quantity: number(item.quantity ?? item.qty ?? 1),
    })),
  };
}

function Stat({ label, value, detail }) {
  return <article className="management-stat"><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</article>;
}

function BarRow({ label, value, max, valueLabel }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="report-bar-row">
      <div>
        <div className="management-row-title" style={{ fontSize: 14 }}>{label}</div>
        <div className="report-track"><div className="report-fill" style={{ width: `${width}%` }} /></div>
      </div>
      <strong>{valueLabel ?? value}</strong>
    </div>
  );
}

function Insight({ label, value, text, tone = "neutral" }) {
  return (
    <article className={`report-insight report-insight--${tone}`}>
      <span>{label}</span>
      <b>{value}</b>
      <p>{text}</p>
    </article>
  );
}

export default function Statistiche() {
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const restaurantName = getRestaurantName();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGet("/orders?history=true");
        const rows = Array.isArray(data) ? data : data?.orders || [];
        if (active) setOrders(rows.map(normalizedOrder));
      } catch (loadError) {
        if (active) setError(loadError.message || "Statistiche temporaneamente non disponibili");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const filteredOrders = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (period - 1));
    return orders
      .filter((order) => order.closedAt && new Date(order.closedAt) >= from)
      .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
  }, [orders, period]);

  const metrics = useMemo(() => {
    const revenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const itemCount = filteredOrders.reduce((sum, order) => sum + order.items.reduce((total, item) => total + item.quantity, 0), 0);
    return {
      revenue,
      orderCount: filteredOrders.length,
      averageTicket: filteredOrders.length ? revenue / filteredOrders.length : 0,
      itemCount,
    };
  }, [filteredOrders]);

  const productStats = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((order) => order.items.forEach((item) => map.set(item.name, (map.get(item.name) || 0) + item.quantity)));
    return [...map.entries()].map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
  }, [filteredOrders]);

  const paymentStats = useMemo(() => {
    const labels = { cash: "Contanti", card: "Carta", online: "Online", satispay: "Satispay", other: "Altro" };
    const map = new Map();
    filteredOrders.forEach((order) => {
      const method = labels[order.payment] || order.payment;
      map.set(method, (map.get(method) || 0) + 1);
    });
    return [...map.entries()].map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  const dailyStats = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((order) => {
      const date = new Date(order.closedAt);
      const key = date.toISOString().slice(0, 10);
      const current = map.get(key) || { date: key, revenue: 0, orders: 0 };
      current.revenue += order.total;
      current.orders += 1;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  }, [filteredOrders]);

  const bestDay = useMemo(() => [...dailyStats].sort((a, b) => b.revenue - a.revenue)[0] || null, [dailyStats]);
  const topProduct = productStats[0] || null;
  const topPayment = paymentStats[0] || null;
  const maxRevenue = Math.max(0, ...dailyStats.map((item) => item.revenue));
  const maxProduct = Math.max(0, ...productStats.map((item) => item.quantity));
  const maxPayment = Math.max(0, ...paymentStats.map((item) => item.count));

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div style={appShellStyle}>
        <main className="app-shell management-os">
          <header className="management-hero-main report-hero-clean">
            <div>
              <div className="management-kicker">Statistiche reali</div>
              <h1 className="management-hero-title">Come sta andando il servizio</h1>
              <p className="management-hero-subtitle">Incasso, ordini, prodotti e pagamenti calcolati solo sui conti realmente chiusi.</p>
            </div>
            <div className="report-period-switch" aria-label="Periodo statistiche">
              {[7, 30, 90].map((days) => <button type="button" key={days} className={period === days ? "is-active" : ""} onClick={() => setPeriod(days)}>{days} giorni</button>)}
            </div>
          </header>

          {error ? <div className="advisor-note">{error}</div> : null}

          <section className="management-card">
            <div className="management-section-head">
              <div><h2 className="management-title">{restaurantName}</h2><p className="management-subtitle">Ultimi {period} giorni</p></div>
            </div>
            <div className="management-stats">
              <Stat label="Incasso" value={money(metrics.revenue)} detail="Conti pagati e chiusi" />
              <Stat label="Ordini" value={metrics.orderCount} detail="Comande concluse" />
              <Stat label="Ticket medio" value={money(metrics.averageTicket)} detail="Media per ordine" />
              <Stat label="Articoli venduti" value={metrics.itemCount} detail="Quantità totale" />
            </div>
          </section>

          {loading ? <section className="management-card report-empty-clean"><b>Caricamento statistiche...</b></section> : null}

          {!loading && !filteredOrders.length ? (
            <section className="management-card report-empty-clean">
              <span>Nessun dato nel periodo</span>
              <h2>Le statistiche partiranno dal primo conto chiuso.</h2>
              <p>Quando la cassa registra un pagamento, questa pagina aggiorna automaticamente incasso, ticket medio, prodotti più ordinati e metodi di pagamento.</p>
            </section>
          ) : null}

          {!loading && filteredOrders.length ? (
            <>
              <section className="report-insight-grid">
                <Insight label="Giorno migliore" value={bestDay ? new Date(`${bestDay.date}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "-"} text={bestDay ? `${money(bestDay.revenue)} da ${bestDay.orders} ordini` : "Dati non disponibili"} tone="green" />
                <Insight label="Prodotto più ordinato" value={topProduct?.name || "-"} text={topProduct ? `${topProduct.quantity} unità nel periodo` : "Dati non disponibili"} tone="blue" />
                <Insight label="Pagamento più usato" value={topPayment?.method || "-"} text={topPayment ? `${topPayment.count} conti su ${metrics.orderCount}` : "Dati non disponibili"} tone="amber" />
              </section>

              <section className="report-simple-grid">
                <article className="management-card report-bar">
                  <div className="management-section-head"><div><h2 className="management-title">Incasso per giorno</h2><p className="management-subtitle">Gli ultimi 14 giorni con movimento.</p></div></div>
                  {dailyStats.map((day) => <BarRow key={day.date} label={new Date(`${day.date}T12:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })} value={day.revenue} max={maxRevenue} valueLabel={money(day.revenue)} />)}
                </article>
                <article className="management-card report-bar">
                  <div className="management-section-head"><div><h2 className="management-title">Prodotti più ordinati</h2><p className="management-subtitle">Quantità vendute nel periodo.</p></div></div>
                  {productStats.map((item) => <BarRow key={item.name} label={item.name} value={item.quantity} max={maxProduct} />)}
                </article>
                <article className="management-card report-bar">
                  <div className="management-section-head"><div><h2 className="management-title">Metodi di pagamento</h2><p className="management-subtitle">Numero di conti per metodo.</p></div></div>
                  {paymentStats.map((item) => <BarRow key={item.method} label={item.method} value={item.count} max={maxPayment} />)}
                </article>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
