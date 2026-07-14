import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import DashboardAlerts from "../components/dashboard/DashboardAlerts.jsx";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import DashboardHourFlow from "../components/dashboard/DashboardHourFlow.jsx";
import DashboardLiveOrders from "../components/dashboard/DashboardLiveOrders.jsx";
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

function ServiceReadinessChecklist({ items, progress }) {
  const ready = items.every((item) => item.done);

  return (
    <section className={ready ? "dash-ready-service is-ready" : "dash-ready-service"}>
      <div className="dash-ready-service__head">
        <div>
          <span>Pronto per il servizio</span>
          <h2>{ready ? "EasyMenu pronto per la sala." : `Setup completato al ${progress}%`}</h2>
          <p>Le poche cose da chiudere prima di stampare QR e partire con il servizio.</p>
        </div>
        <Link to="/onboarding">{ready ? "Rivedi setup" : "Completa configurazione"}</Link>
      </div>
      <div className="dash-ready-service__grid">
        {items.map((item) => (
          <Link key={item.label} to={item.to} className={item.done ? "is-done" : ""}>
            <i>{item.done ? "OK" : "NO"}</i>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [setupStatus, setSetupStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setError] = useState("");
  const [liveBadge, setLiveBadge] = useState("connessione live...");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const restaurantName = getRestaurantName();
  const isSuperAdminMode = localStorage.getItem("superadmin_mode") === "1" || Boolean(localStorage.getItem("superadmin_platform_session"));

  const load = useCallback(async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      const [analyticsResult, setupResult] = await Promise.allSettled([
        apiGet("/analytics/summary"),
        apiGet("/onboarding/status"),
      ]);
      if (analyticsResult.status === "fulfilled") setData(analyticsResult.value);
      if (setupResult.status === "fulfilled") setSetupStatus(setupResult.value);
      setError("");
    } catch (err) {
      console.warn("Dashboard analytics non disponibili", err);
      setError("");
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
  const moneyHidden = Boolean(data?.privacyMode);
  const setupChecks = setupStatus?.checks || {};
  const readinessItems = useMemo(() => [
    { label: "Logo caricato", done: Boolean(setupChecks.profile), to: "/admin?tab=settings" },
    { label: "Tavoli creati", done: Boolean(setupChecks.tables), to: "/tavoli" },
    { label: "Menu inserito", done: Boolean(setupChecks.menu), to: "/admin?tab=menu" },
    { label: "QR generati", done: Boolean(setupChecks.qr), to: "/qr" },
    { label: "Cucina pronta", done: Boolean(setupChecks.menu), to: "/cucina" },
    { label: "Cassa pronta", done: Boolean(setupChecks.tables), to: "/cassa" },
    { label: "Abbonamento attivo", done: Boolean(setupChecks.billing), to: "/billing" },
  ], [setupChecks.billing, setupChecks.menu, setupChecks.profile, setupChecks.qr, setupChecks.tables]);
  const readinessProgress = setupStatus?.progress ?? Math.round((readinessItems.filter((item) => item.done).length / readinessItems.length) * 100);

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
            <div><b>Modalita assistenza SuperAdmin</b> - valori economici nascosti per privacy del ristorante.</div>
            <button
              type="button"
              onClick={() => {
                const snapshot = JSON.parse(localStorage.getItem("superadmin_platform_session") || "null");
                if (snapshot?.token) localStorage.setItem("auth_token", snapshot.token);
                if (snapshot?.user) localStorage.setItem("auth_user", snapshot.user);
                if (snapshot?.restaurant) localStorage.setItem("auth_restaurant", snapshot.restaurant);
                localStorage.removeItem("superadmin_mode");
                localStorage.removeItem("superadmin_original_token");
                localStorage.removeItem("superadmin_platform_session");
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

        <ServiceReadinessChecklist items={readinessItems} progress={readinessProgress} />

        {data?.privacyMode ? (
          <div className="dash-super-banner">
            <div><b>Privacy attiva</b> - incasso, ticket medio e importi ordine sono oscurati durante l'assistenza SuperAdmin.</div>
          </div>
        ) : null}

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
            <small>Aggiorna solo cosa il cliente puo ordinare.</small>
          </Link>
          <Link className={alertCount ? "dash-service-card is-warning" : "dash-service-card is-calm"} to="/errori">
            <span>Controllo</span>
            <b>{alertCount ? `${alertCount} alert` : "Tutto regolare"}</b>
            <small>Verifica pagamenti, errori e avvisi.</small>
          </Link>
        </section>

        <section className="dash-main-grid dash-main-grid--focus">
          <div>
            <DashboardLiveOrders orders={live.activeOrders || []} />
          </div>

          <aside className="dash-side-stack">
            <DashboardTableMap
              activeTables={live.activeTables || []}
              totalTables={kpis.totalTables || 0}
              activeCount={kpis.activeTables || 0}
            />
          </aside>
        </section>

        <div className="dash-advanced-control">
          <button type="button" onClick={() => setAdvancedOpen((value) => !value)}>
            {advancedOpen ? "Nascondi dettagli" : "Mostra dettagli avanzati"}
          </button>
          <span>Dettagli e alert tecnici restano disponibili senza riempire la schermata principale.</span>
        </div>

        {advancedOpen ? (
          <>
            <section className="dash-kpi-grid dash-kpi-grid--advanced">
              <DashboardStat label="Incasso oggi" value={moneyHidden ? "Nascosto" : euro(kpis.revenueToday)} detail={`${num(kpis.completedOrdersToday)} ordini completati`} tone="money" />
              <DashboardStat label="Ordini attivi" value={num(kpis.openOrders)} detail="Da cucina, bar e cassa" tone="live" />
              <DashboardStat label="Tavoli occupati" value={`${num(kpis.activeTables)}/${num(kpis.totalTables)}`} detail={`${num(kpis.freeTables)} tavoli liberi`} />
              <DashboardStat label="Ticket medio" value={moneyHidden ? "Nascosto" : euro(kpis.averageTicketToday)} detail="Scontrino medio oggi" tone={alertCount ? "warning" : "neutral"} />
            </section>

            <section className="dash-main-grid dash-main-grid--advanced">
              <div className="dash-analytics-grid">
                <DashboardTopProducts products={charts.topProductsToday || []} />
                <DashboardHourFlow hours={charts.byHourToday || []} />
              </div>

              <aside className="dash-side-stack">
                <DashboardAlerts alerts={alerts} />
              </aside>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default Dashboard;
