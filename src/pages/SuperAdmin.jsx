import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import {
  apiGet,
  apiPatch,
  apiPost,
  getAuthToken,
  setAuthToken,
} from "../lib/api";
import "../styles/superadmin.css";

const PLAN_OPTIONS = ["starter", "growth", "semiannual", "enterprise"];

const PLAN_LABELS = {
  starter: "Mensile",
  growth: "Trimestrale",
  semiannual: "Semestrale",
  enterprise: "Annuale",
};

const SUBSCRIPTION_STATUS_OPTIONS = ["trialing", "active", "past_due", "canceled", "unpaid", "incomplete"];

const SUBSCRIPTION_STATUS_LABELS = {
  trialing: "Trial",
  active: "Attivo",
  past_due: "Pagamento richiesto",
  canceled: "Cancellato",
  unpaid: "Non pagato",
  incomplete: "Incompleto",
};

const PLATFORM_ROADMAP = [
  {
    area: "Pagamenti",
    title: "SumUp / Nexi",
    status: "Priorità alta",
    impact: "Incasso al tavolo e riconciliazione pagamenti: aumenta il valore percepito del prodotto.",
  },
  {
    area: "Fiscale",
    title: "Fatture in Cloud",
    status: "Priorità alta",
    impact: "Export fiscale e documenti contabili: utile per ristoranti più strutturati.",
  },
  {
    area: "POS",
    title: "Tilby / Cassa in Cloud",
    status: "Discovery",
    impact: "Riduce sostituzione del gestionale esistente: EasyMenu diventa strato operativo.",
  },
  {
    area: "Prenotazioni",
    title: "TheFork / gestione turni",
    status: "Discovery",
    impact: "Collega sala, tavoli e coperti: forte leva per locali con servizio su prenotazione.",
  },
];

function getStatusLabel(restaurant) {
  const status = getSubscriptionStatus(restaurant);
  if (status === "past_due" || status === "unpaid") return "Pagamento richiesto";
  if (status === "canceled") return "Disdetto";
  if (status === "incomplete") return "Incompleto";
  if (!restaurant?.isActive) return "Sospeso";
  if (!isSubscriptionPeriodOpen(restaurant)) return "Scaduto";
  if (status === "trialing") return "Trial attivo";
  return "Attivo";
}

function getSubscriptionStatus(restaurant) {
  return restaurant?.subscription?.status || "incomplete";
}

function getSubscriptionEnd(restaurant) {
  return restaurant?.subscription?.currentPeriodEnd || restaurant?.subscription?.trialEndsAt || "";
}

function isSubscriptionPeriodOpen(restaurant) {
  const end = getSubscriptionEnd(restaurant);
  if (!end) return true;
  return new Date(end).getTime() > Date.now();
}

function isBillingUsable(restaurant) {
  const status = getSubscriptionStatus(restaurant);
  return Boolean(restaurant?.isActive) && ["trialing", "active"].includes(status) && isSubscriptionPeriodOpen(restaurant);
}

function formatDate(value) {
  if (!value) return "nessuna scadenza";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data non valida";
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getBillingHint(restaurant) {
  const status = SUBSCRIPTION_STATUS_LABELS[getSubscriptionStatus(restaurant)] || getSubscriptionStatus(restaurant);
  const end = getSubscriptionEnd(restaurant);
  return end ? `${status} - fino al ${formatDate(end)}` : `${status} - nessuna scadenza`;
}

function getAlerts(restaurant) {
  const alerts = [];
  if ((restaurant.counts?.menuItems || 0) === 0) alerts.push("Menu vuoto");
  if ((restaurant.counts?.tables || 0) === 0) alerts.push("Nessun tavolo");
  if (!restaurant.owner?.email) alerts.push("Owner mancante");
  if (!restaurant.isActive) alerts.push("Sospeso");
  if (!isBillingUsable(restaurant)) alerts.push("Abbonamento da sistemare");
  if (restaurant.subscription?.status === "past_due" || restaurant.subscription?.status === "unpaid") {
    alerts.push("Pagamento da verificare");
  }
  return alerts;
}

function saveRestaurantSession(data) {
  setAuthToken(data.token);
  localStorage.setItem("auth_user", JSON.stringify(data.user));
  localStorage.setItem("auth_restaurant", JSON.stringify(data.restaurant));
  localStorage.setItem("ristorante_attivo", data.restaurant?.name || "");
  localStorage.setItem("restaurant_slug", data.restaurant?.slug || "");
  localStorage.setItem("restaurant_id", data.restaurant?.id || "");
}

function savePlatformSnapshot() {
  const snapshot = {
    token: getAuthToken(),
    user: localStorage.getItem("auth_user"),
    restaurant: localStorage.getItem("auth_restaurant"),
  };
  localStorage.setItem("superadmin_platform_session", JSON.stringify(snapshot));
}

function StatCard({ label, value, hint }) {
  return (
    <div className="superadmin-panel superadmin-stat">
      <div className="superadmin-stat-label">{label}</div>
      <div className="superadmin-stat-value">{value}</div>
      <div className="superadmin-stat-help">{hint}</div>
    </div>
  );
}

export default function SuperAdmin() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    ownerName: "Owner",
    ownerEmail: "",
    ownerPassword: "EasyMenu2026!",
    plan: "starter",
    tablesCount: 10,
  });

  async function loadRestaurants() {
    try {
      setLoading(true);
      setErrore("");
      const data = await apiGet("/restaurants/super-admin");
      setRestaurants(Array.isArray(data?.restaurants) ? data.restaurants : []);
    } catch (error) {
      setErrore(error.message || "Errore durante il recupero ristoranti");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  const stats = useMemo(
    () =>
      restaurants.reduce(
        (acc, restaurant) => {
          acc.total += 1;
          if (isBillingUsable(restaurant)) acc.active += 1;
          else acc.suspended += 1;
          acc.tables += restaurant.counts?.tables || 0;
          acc.menuItems += restaurant.counts?.menuItems || 0;
          acc.alerts += getAlerts(restaurant).length;
          return acc;
        },
        { total: 0, active: 0, suspended: 0, tables: 0, menuItems: 0, alerts: 0 }
      ),
    [restaurants]
  );

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const owner = `${restaurant.owner?.email || ""} ${restaurant.owner?.name || ""}`;
      const haystack = `${restaurant.name} ${restaurant.slug} ${owner} ${PLAN_LABELS[restaurant.plan] || restaurant.plan}`.toLowerCase();

      if (statusFilter === "active" && !isBillingUsable(restaurant)) return false;
      if (statusFilter === "suspended" && isBillingUsable(restaurant)) return false;
      if (PLAN_OPTIONS.includes(statusFilter) && restaurant.plan !== statusFilter) return false;
      if (statusFilter === "alerts" && getAlerts(restaurant).length === 0) return false;

      return !q || haystack.includes(q);
    });
  }, [restaurants, query, statusFilter]);

  async function updateRestaurant(restaurantId, patch) {
    try {
      setSavingId(restaurantId);
      setErrore("");
      setSuccesso("");

      const data = await apiPatch(`/restaurants/super-admin/${restaurantId}`, patch);
      const updated = data.restaurant;

      setRestaurants((prev) => prev.map((item) => (item.id === restaurantId ? updated : item)));
      setSelected((prev) => (prev?.id === restaurantId ? updated : prev));
      setSuccesso(data.message || "Ristorante aggiornato");
      return updated;
    } catch (error) {
      setErrore(error.message || "Errore durante aggiornamento ristorante");
      return null;
    } finally {
      setSavingId("");
    }
  }

  async function unlockRestaurant(restaurant) {
    return updateRestaurant(restaurant.id, {
      isActive: true,
      plan: restaurant.plan || "starter",
      subscriptionStatus: "trialing",
      subscriptionDays: 30,
      cancelAtPeriodEnd: false,
    });
  }

  async function unlockAndOpenMenu(restaurant) {
    const updated = await unlockRestaurant(restaurant);
    if (updated) await openManagement(updated, "/admin?tab=menu");
  }

  async function openManagement(restaurant, targetPath = "/dashboard") {
    try {
      const supportReason = window.prompt(
        `Motivo supporto per ${restaurant.name}: inserisci ticket, richiesta o consenso del ristorante.`
      );
      if (!supportReason || supportReason.trim().length < 8) {
        setErrore("Accesso supporto annullato: serve un motivo chiaro o consenso esplicito.");
        return;
      }

      setSavingId(restaurant.id);
      setErrore("");
      setSuccesso("");

      const data = await apiPost(`/restaurants/super-admin/${restaurant.id}/impersonate`, { supportReason: supportReason.trim() });

      if (!data?.token || !data?.restaurant) {
        throw new Error("Risposta impersonificazione non valida");
      }

      savePlatformSnapshot();
      saveRestaurantSession(data);

      // Hard navigation: forza ProtectedRoute, Navbar e API a leggere subito il nuovo token.
      window.location.assign(targetPath);
    } catch (error) {
      setErrore(error.message || "Errore apertura gestione ristorante");
    } finally {
      setSavingId("");
    }
  }

  async function createRestaurant(event) {
    event.preventDefault();

    try {
      setSavingId("create");
      setErrore("");
      setSuccesso("");

      const data = await apiPost("/restaurants/super-admin", createForm);
      setRestaurants((prev) => [data.restaurant, ...prev]);
      setShowCreate(false);
      setCreateForm({
        name: "",
        slug: "",
        ownerName: "Owner",
        ownerEmail: "",
        ownerPassword: "EasyMenu2026!",
        plan: "starter",
        tablesCount: 10,
      });
      setSuccesso("Ristorante creato. Puoi aprirlo subito da Apri gestione.");
    } catch (error) {
      setErrore(error.message || "Errore creazione ristorante");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="superadmin-page">
      <Navbar />

      <main className="superadmin-main">
        <section className="superadmin-hero">
          <div className="superadmin-panel superadmin-hero-card">
            <div className="superadmin-kicker">Console piattaforma</div>
            <h1 className="superadmin-title">SuperAdmin EasyMenu</h1>
            <p className="superadmin-subtitle">
              Gestisci clienti, piani, stato servizio e accesso operativo ai ristoranti. Da qui controlli la piattaforma,
              non un singolo locale.
            </p>

            <div className="superadmin-actions">
              <button className="superadmin-btn primary" onClick={() => setShowCreate(true)}>
                + Nuovo ristorante
              </button>
              <button className="superadmin-btn" onClick={loadRestaurants} disabled={loading}>
                {loading ? "Aggiorno..." : "Aggiorna dati"}
              </button>
            </div>
          </div>

          <div className="superadmin-panel superadmin-health">
            <h3>Stato piattaforma</h3>
            <div className="superadmin-health-row">
              <span>Ristoranti attivi</span>
              <strong>{stats.active}</strong>
            </div>
            <div className="superadmin-health-row">
              <span>Alert operativi</span>
              <strong>{stats.alerts}</strong>
            </div>
            <div className="superadmin-health-row">
              <span>Menu caricati</span>
              <strong>{stats.menuItems}</strong>
            </div>
            <div className="superadmin-health-row">
              <span>Tavoli configurati</span>
              <strong>{stats.tables}</strong>
            </div>
          </div>
        </section>

        {errore && <div className="superadmin-message error">{errore}</div>}
        {successo && <div className="superadmin-message success">{successo}</div>}

        <section className="superadmin-stats">
          <StatCard label="Ristoranti" value={stats.total} hint="Totali in piattaforma" />
          <StatCard label="Attivi" value={stats.active} hint="Utilizzabili dai clienti" />
          <StatCard label="Sospesi" value={stats.suspended} hint="Disattivati" />
          <StatCard label="Tavoli" value={stats.tables} hint="QR configurati" />
          <StatCard label="Privacy" value="ON" hint="Dati economici non aggregati" />
          <StatCard label="Alert" value={stats.alerts} hint="Da controllare" />
        </section>

        <section className="superadmin-panel superadmin-roadmap">
          <div className="superadmin-card-header">
            <div>
              <h2 className="superadmin-card-title">Roadmap competitiva</h2>
              <p className="superadmin-card-subtitle">
                Questa sezione è solo tua: serve a decidere quali integrazioni rendono EasyMenu più forte come SaaS.
              </p>
            </div>
          </div>
          <div className="superadmin-roadmap-grid">
            {PLATFORM_ROADMAP.map((item) => (
              <article key={`${item.area}-${item.title}`} className="superadmin-roadmap-card">
                <span>{item.area}</span>
                <h3>{item.title}</h3>
                <b>{item.status}</b>
                <p>{item.impact}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="superadmin-panel superadmin-card">
          <div className="superadmin-card-header">
            <div>
              <h2 className="superadmin-card-title">Lista ristoranti</h2>
              <p className="superadmin-card-subtitle">
                Cerca, verifica owner, cambia piano o sospendi account. Per privacy non mostriamo fatturato o dati economici aggregati dei ristoranti.
              </p>
            </div>
            <button className="superadmin-btn" onClick={loadRestaurants} disabled={loading}>
              {loading ? "Carico..." : "Aggiorna"}
            </button>
          </div>

          <div className="superadmin-toolbar">
            <input
              className="superadmin-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca nome, slug, owner o email"
            />

            <select
              className="superadmin-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tutti</option>
              <option value="active">Attivi</option>
              <option value="suspended">Sospesi</option>
              <option value="alerts">Con alert</option>
              <option value="starter">Mensile</option>
              <option value="growth">Trimestrale</option>
              <option value="semiannual">Semestrale</option>
              <option value="enterprise">Annuale</option>
            </select>
          </div>

          <div className="superadmin-table-wrap">
            <table className="superadmin-table">
              <thead>
                <tr>
                  <th>Ristorante</th>
                  <th>Owner</th>
                  <th>Piano e billing</th>
                  <th>Stato</th>
                  <th>Setup</th>
                  <th>Alert</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="7">Caricamento ristoranti...</td>
                  </tr>
                )}

                {!loading && filteredRestaurants.length === 0 && (
                  <tr>
                    <td colSpan="7">Nessun ristorante trovato.</td>
                  </tr>
                )}

                {!loading &&
                  filteredRestaurants.map((restaurant) => {
                    const alerts = getAlerts(restaurant);

                    return (
                      <tr key={restaurant.id}>
                        <td>
                          <div className="superadmin-restaurant-name">{restaurant.name}</div>
                          <div className="superadmin-muted">{restaurant.slug || "-"}</div>
                        </td>
                        <td>
                          <div>{restaurant.owner?.name || "-"}</div>
                          <div className="superadmin-muted">{restaurant.owner?.email || "-"}</div>
                        </td>
                        <td>
                          <div className="superadmin-billing-stack">
                            <select
                              className="superadmin-select"
                              value={restaurant.plan || "starter"}
                              onChange={(event) => updateRestaurant(restaurant.id, { plan: event.target.value })}
                              disabled={savingId === restaurant.id}
                            >
                              {PLAN_OPTIONS.map((plan) => (
                                <option key={plan} value={plan}>
                                  {PLAN_LABELS[plan] || plan}
                                </option>
                              ))}
                            </select>
                            <select
                              className="superadmin-select"
                              value={getSubscriptionStatus(restaurant)}
                              onChange={(event) =>
                                updateRestaurant(restaurant.id, {
                                  subscriptionStatus: event.target.value,
                                  subscriptionDays: 30,
                                  cancelAtPeriodEnd: false,
                                })
                              }
                              disabled={savingId === restaurant.id}
                            >
                              {SUBSCRIPTION_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {SUBSCRIPTION_STATUS_LABELS[status] || status}
                                </option>
                              ))}
                            </select>
                            <div className="superadmin-inline-note">{getBillingHint(restaurant)}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`superadmin-status ${isBillingUsable(restaurant) ? "is-active" : "is-suspended"}`}>
                            {getStatusLabel(restaurant)}
                          </span>
                        </td>
                        <td>
                          Menu {restaurant.counts?.menuItems || 0} - Tavoli {restaurant.counts?.tables || 0}
                        </td>
                        <td>
                          {alerts.length ? (
                            alerts.map((alert) => (
                              <span key={alert} className="superadmin-chip">
                                {alert}
                              </span>
                            ))
                          ) : (
                            <span className="superadmin-chip ok">OK</span>
                          )}
                        </td>
                        <td>
                          <div className="superadmin-row-actions">
                            {!isBillingUsable(restaurant) ? (
                              <>
                                <button
                                  className="superadmin-btn success"
                                  onClick={() => unlockRestaurant(restaurant)}
                                  disabled={savingId === restaurant.id}
                                >
                                  Sblocca 30g
                                </button>
                                <button
                                  className="superadmin-btn success"
                                  onClick={() => unlockAndOpenMenu(restaurant)}
                                  disabled={savingId === restaurant.id}
                                >
                                  Attiva + menu
                                </button>
                              </>
                            ) : null}
                            <button
                              className="superadmin-btn primary"
                              onClick={() => openManagement(restaurant, "/dashboard")}
                              disabled={savingId === restaurant.id}
                            >
                              {savingId === restaurant.id ? "Apro..." : "Apri supporto"}
                            </button>
                            <button
                              className="superadmin-btn"
                              onClick={() => openManagement(restaurant, "/admin?tab=menu")}
                              disabled={savingId === restaurant.id}
                            >
                              Menu
                            </button>
                            <button className="superadmin-btn" onClick={() => setSelected(restaurant)}>
                              Dettagli
                            </button>
                            <button
                              className={`superadmin-btn ${restaurant.isActive ? "danger" : "success"}`}
                              onClick={() =>
                                restaurant.isActive
                                  ? updateRestaurant(restaurant.id, { isActive: false })
                                  : unlockRestaurant(restaurant)
                              }
                              disabled={savingId === restaurant.id}
                            >
                              {restaurant.isActive ? "Sospendi" : "Riattiva"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {selected && (
        <div className="superadmin-modal-backdrop">
          <div className="superadmin-panel superadmin-modal">
            <div className="superadmin-card-header">
              <div>
                <h2 className="superadmin-card-title">{selected.name}</h2>
                <p className="superadmin-card-subtitle">{selected.slug}</p>
              </div>
              <button className="superadmin-btn" onClick={() => setSelected(null)}>
                Chiudi
              </button>
            </div>

            <div className="superadmin-form-grid">
              <label>
                Nome
                <input
                  className="superadmin-input"
                  defaultValue={selected.name}
                  onBlur={(event) =>
                    event.target.value !== selected.name && updateRestaurant(selected.id, { name: event.target.value })
                  }
                />
              </label>
              <label>
                Slug
                <input
                  className="superadmin-input"
                  defaultValue={selected.slug}
                  onBlur={(event) =>
                    event.target.value !== selected.slug && updateRestaurant(selected.id, { slug: event.target.value })
                  }
                />
              </label>
            </div>

            <h3>Owner visibile</h3>
            {(selected.users || []).map((user) => (
              <div key={user.id} style={{ padding: "10px 0", borderTop: "1px solid #e2e8f0" }}>
                <strong>{user.name}</strong> - {user.email} - {user.role} - {user.isActive ? "attivo" : "disattivo"}
              </div>
            ))}
            <p className="superadmin-muted">Gli utenti staff restano nascosti al superadmin, salvo accesso supporto motivato.</p>

            <h3>Setup</h3>
            <p>
              Menu: {selected.counts?.menuItems || 0} - Tavoli: {selected.counts?.tables || 0} - Utenti: {selected.counts?.users || 0}
            </p>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="superadmin-modal-backdrop">
          <form onSubmit={createRestaurant} className="superadmin-panel superadmin-modal">
            <div className="superadmin-card-header">
              <div>
                <h2 className="superadmin-card-title">Nuovo ristorante</h2>
                <p className="superadmin-card-subtitle">Crea cliente, owner e tavoli iniziali.</p>
              </div>
              <button type="button" className="superadmin-btn" onClick={() => setShowCreate(false)}>
                Chiudi
              </button>
            </div>

            <div className="superadmin-form-grid">
              <label>
                Nome ristorante
                <input
                  required
                  className="superadmin-input"
                  value={createForm.name}
                  onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                />
              </label>
              <label>
                Slug opzionale
                <input
                  className="superadmin-input"
                  value={createForm.slug}
                  onChange={(event) => setCreateForm({ ...createForm, slug: event.target.value })}
                />
              </label>
              <label>
                Nome owner
                <input
                  required
                  className="superadmin-input"
                  value={createForm.ownerName}
                  onChange={(event) => setCreateForm({ ...createForm, ownerName: event.target.value })}
                />
              </label>
              <label>
                Email owner
                <input
                  required
                  type="email"
                  className="superadmin-input"
                  value={createForm.ownerEmail}
                  onChange={(event) => setCreateForm({ ...createForm, ownerEmail: event.target.value })}
                />
              </label>
              <label>
                Password iniziale
                <input
                  required
                  className="superadmin-input"
                  value={createForm.ownerPassword}
                  onChange={(event) => setCreateForm({ ...createForm, ownerPassword: event.target.value })}
                />
              </label>
              <label>
                Piano
                <select
                  className="superadmin-select"
                  value={createForm.plan}
                  onChange={(event) => setCreateForm({ ...createForm, plan: event.target.value })}
                >
                  {PLAN_OPTIONS.map((plan) => (
                    <option key={plan} value={plan}>
                      {PLAN_LABELS[plan] || plan}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tavoli iniziali
                <input
                  type="number"
                  min="0"
                  max="80"
                  className="superadmin-input"
                  value={createForm.tablesCount}
                  onChange={(event) => setCreateForm({ ...createForm, tablesCount: event.target.value })}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button type="button" className="superadmin-btn" onClick={() => setShowCreate(false)}>
                Annulla
              </button>
              <button type="submit" disabled={savingId === "create"} className="superadmin-btn primary">
                {savingId === "create" ? "Creo..." : "Crea ristorante"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
