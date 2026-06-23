import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import DashboardAlerts from "../components/dashboard/DashboardAlerts.jsx";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import DashboardHourFlow from "../components/dashboard/DashboardHourFlow.jsx";
import DashboardLiveOrders from "../components/dashboard/DashboardLiveOrders.jsx";
import DashboardQuickActions from "../components/dashboard/DashboardQuickActions.jsx";
import DashboardStat from "../components/dashboard/DashboardStat.jsx";
import DashboardTableMap from "../components/dashboard/DashboardTableMap.jsx";
import DashboardTopProducts from "../components/dashboard/DashboardTopProducts.jsx";
import { apiGet } from "../lib/api";
import { createRestaurantSocket, playOrderSound } from "../lib/realtime";
import "../styles/dashboard-premium.css";

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
      setError(err.message || "Errore caricamento dashboard");
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

  const alertCount = num(kpis.unresolvedErrors) + num(kpis.paymentAlerts) + num(kpis.unavailableItems);
  const busyTables = num(kpis.activeTables);
  const freeTables = num(kpis.freeTables);
  const openOrders = num(kpis.openOrders);

  if (!restaurantName) {
    return (
      <div className="dash-os-page">
        <Navbar />
        <main className="dash-os-shell">
          <section className="dash-empty-restaurant">
            <h1>Nessun ristorante attivo</h1>
            <p>Accedi dall'area admin o seleziona un ristorante per aprire la dashboard operativa.</p>
            <Link to="/admin">Vai all'area admin</Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="dash-os-page">
      <Navbar />
      <main className="dash-os-shell">
        {isSuperAdminMode ? (
          <div className="dash-super-banner">
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
            >
              Torna a Super Admin
            </button>
          </div>
        ) : null}

        <DashboardHeader
          restaurantName={restaurantName}
          liveBadge={liveBadge}
          refreshing={refreshing || loading}
          onRefresh={() => load(true)}
        />

        {error ? <div className="dash-error-banner">{error}</div> : null}

        <section className="dash-kpi-grid">
          <DashboardStat label="Incasso oggi" value={euro(kpis.revenueToday)} detail={`${num(kpis.completedOrdersToday)} ordini completati`} tone="money" />
          <DashboardStat label="Ordini attivi" value={num(kpis.openOrders)} detail="Da cucina, bar e cassa" tone="live" />
          <DashboardStat label="Tavoli occupati" value={`${num(kpis.activeTables)}/${num(kpis.totalTables)}`} detail={`${num(kpis.freeTables)} tavoli liberi`} />
          <DashboardStat label="Ticket medio" value={euro(kpis.averageTicketToday)} detail="Scontrino medio oggi" tone={alertCount ? "warning" : "neutral"} />
        </section>

        <section className="dash-service-strip">
          <Link className={openOrders ? "dash-service-card is-hot" : "dash-service-card"} to="/cucina">
            <span>Servizio</span>
            <b>{openOrders ? `${openOrders} ordini attivi` : "Nessun ordine attivo"}</b>
            <small>Apri cucina e bar per seguire il pass.</small>
          </Link>
          <Link className={busyTables ? "dash-service-card" : "dash-service-card is-calm"} to="/tavoli">
            <span>Sala</span>
            <b>{busyTables} occupati / {freeTables} liberi</b>
            <small>Controlla tavoli, QR e prenotazioni.</small>
          </Link>
          <Link className={num(kpis.unavailableItems) ? "dash-service-card is-warning" : "dash-service-card"} to="/admin">
            <span>Menu</span>
            <b>{num(kpis.unavailableItems)} piatti non disponibili</b>
            <small>Aggiorna disponibilita, foto e descrizioni.</small>
          </Link>
          <Link className={alertCount ? "dash-service-card is-warning" : "dash-service-card is-calm"} to="/errori">
            <span>Controllo</span>
            <b>{alertCount ? `${alertCount} alert` : "Tutto regolare"}</b>
            <small>Verifica pagamenti, errori e avvisi.</small>
          </Link>
        </section>

        <section className="dash-main-grid">
          <div>
            <DashboardLiveOrders orders={live.activeOrders || []} />
            <div className="dash-analytics-grid">
              <DashboardTopProducts products={charts.topProductsToday || []} />
              <DashboardHourFlow hours={charts.byHourToday || []} />
            </div>
          </div>

          <aside className="dash-side-stack">
            <DashboardTableMap
              activeTables={live.activeTables || []}
              totalTables={kpis.totalTables || 0}
              activeCount={kpis.activeTables || 0}
            />
            <DashboardAlerts alerts={alerts} />
            <DashboardQuickActions />
          </aside>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
