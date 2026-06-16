import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { apiGet, apiPatch, apiPost, getAuthToken, setAuthToken } from "../lib/api";

const cardStyle = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(148,163,184,0.24)",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
};

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "white",
  fontWeight: 850,
  cursor: "pointer",
};

const primaryButton = {
  ...buttonStyle,
  color: "white",
  border: "none",
  background: "linear-gradient(135deg,#2563eb,#0891b2)",
};

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
  } catch {
    return "-";
  }
}

function getStatusLabel(restaurant) {
  if (!restaurant?.isActive) return "Sospeso";
  const status = restaurant?.subscription?.status;
  if (status === "past_due" || status === "unpaid") return "Pagamento richiesto";
  if (status === "canceled") return "Disdetto";
  return "Attivo";
}

function getAlerts(restaurant) {
  const alerts = [];
  if ((restaurant.counts?.menuItems || 0) === 0) alerts.push("Menu vuoto");
  if ((restaurant.counts?.tables || 0) === 0) alerts.push("Nessun tavolo");
  if (!restaurant.owner?.email) alerts.push("Owner mancante");
  if (!restaurant.isActive) alerts.push("Sospeso");
  if (restaurant.subscription?.status === "past_due" || restaurant.subscription?.status === "unpaid") alerts.push("Pagamento da verificare");
  return alerts;
}

function inputStyle() {
  return { padding: 12, borderRadius: 12, border: "1px solid #dbeafe", fontSize: 15, width: "100%", boxSizing: "border-box" };
}

export default function SuperAdmin() {
  const navigate = useNavigate();
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

  const stats = useMemo(() => restaurants.reduce((acc, restaurant) => {
    acc.total += 1;
    if (restaurant.isActive) acc.active += 1;
    else acc.suspended += 1;
    acc.orders += restaurant.counts?.orders || 0;
    acc.tables += restaurant.counts?.tables || 0;
    acc.menuItems += restaurant.counts?.menuItems || 0;
    acc.alerts += getAlerts(restaurant).length;
    return acc;
  }, { total: 0, active: 0, suspended: 0, orders: 0, tables: 0, menuItems: 0, alerts: 0 }), [restaurants]);

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const owner = `${restaurant.owner?.email || ""} ${restaurant.owner?.name || ""}`;
      const haystack = `${restaurant.name} ${restaurant.slug} ${owner} ${restaurant.plan}`.toLowerCase();
      if (statusFilter === "active" && !restaurant.isActive) return false;
      if (statusFilter === "suspended" && restaurant.isActive) return false;
      if (statusFilter === "starter" && restaurant.plan !== "starter") return false;
      if (statusFilter === "growth" && restaurant.plan !== "growth") return false;
      if (statusFilter === "enterprise" && restaurant.plan !== "enterprise") return false;
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
      setRestaurants((prev) => prev.map((item) => item.id === restaurantId ? updated : item));
      setSelected((prev) => prev?.id === restaurantId ? updated : prev);
      setSuccesso(data.message || "Ristorante aggiornato");
    } catch (error) {
      setErrore(error.message || "Errore durante aggiornamento ristorante");
    } finally {
      setSavingId("");
    }
  }

  async function openManagement(restaurant) {
    try {
      setSavingId(restaurant.id);
      setErrore("");
      const platformSnapshot = {
        token: getAuthToken(),
        user: localStorage.getItem("auth_user"),
        restaurant: localStorage.getItem("auth_restaurant"),
      };
      localStorage.setItem("superadmin_platform_session", JSON.stringify(platformSnapshot));

      const data = await apiPost(`/restaurants/super-admin/${restaurant.id}/impersonate`, {});
      setAuthToken(data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      localStorage.setItem("auth_restaurant", JSON.stringify(data.restaurant));
      localStorage.setItem("ristorante_attivo", data.restaurant?.name || "");
      localStorage.setItem("restaurant_slug", data.restaurant?.slug || "");
      localStorage.setItem("restaurant_id", data.restaurant?.id || "");
      navigate("/dashboard");
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
      setCreateForm({ name: "", slug: "", ownerName: "Owner", ownerEmail: "", ownerPassword: "EasyMenu2026!", plan: "starter", tablesCount: 10 });
      setSuccesso("Ristorante creato. Puoi aprirlo subito da Apri gestione.");
    } catch (error) {
      setErrore(error.message || "Errore creazione ristorante");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#eef6ff,#f8fbff)" }}>
      <Navbar />
      <main style={{ maxWidth: 1460, margin: "0 auto", padding: "30px 22px 72px" }}>
        <section style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <div style={{ color: "#0f172a", fontSize: 15, marginBottom: 8, fontWeight: 800 }}>Console piattaforma</div>
            <h1 style={{ margin: 0, fontSize: 38, color: "#061638", letterSpacing: "-0.04em" }}>SuperAdmin EasyMenu</h1>
            <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 17 }}>
              Gestisci clienti, piani, stato servizio e accesso operativo ai ristoranti.
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} style={primaryButton}>+ Nuovo ristorante</button>
        </section>

        {errore && <div style={{ ...cardStyle, borderColor: "#fecaca", color: "#b91c1c", marginBottom: 16 }}>{errore}</div>}
        {successo && <div style={{ ...cardStyle, borderColor: "#bbf7d0", color: "#166534", marginBottom: 16 }}>{successo}</div>}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
          {[
            ["RISTORANTI", stats.total, "Totali"],
            ["ATTIVI", stats.active, "Operativi"],
            ["SOSPESI", stats.suspended, "Da riattivare"],
            ["ORDINI", stats.orders, "Storico"],
            ["TAVOLI", stats.tables, "QR configurati"],
            ["ALERT", stats.alerts, "Da controllare"],
          ].map(([label, value, hint]) => (
            <div key={label} style={cardStyle}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", letterSpacing: 0.8 }}>{label}</div>
              <div style={{ fontSize: 30, fontWeight: 950, color: "#061638", marginTop: 14 }}>{value}</div>
              <div style={{ color: "#64748b", marginTop: 6, fontSize: 13 }}>{hint}</div>
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 28, color: "#061638" }}>Ristoranti</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>Apri gestione, cambia piano o sospendi account.</p>
            </div>
            <button onClick={loadRestaurants} style={buttonStyle}>Aggiorna</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12, marginTop: 18 }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca nome, slug, owner o email" style={inputStyle()} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle()}>
              <option value="all">Tutti</option>
              <option value="active">Solo attivi</option>
              <option value="suspended">Solo sospesi</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
              <option value="alerts">Con alert</option>
            </select>
          </div>

          <div style={{ overflowX: "auto", marginTop: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#475569", fontSize: 14 }}>
                  <th style={{ padding: "12px 10px" }}>Ristorante</th><th>Owner</th><th>Piano</th><th>Stato</th><th>Numeri</th><th>Alert</th><th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="7" style={{ padding: 18 }}>Caricamento ristoranti...</td></tr>}
                {!loading && filteredRestaurants.length === 0 && <tr><td colSpan="7" style={{ padding: 18 }}>Nessun ristorante trovato.</td></tr>}
                {!loading && filteredRestaurants.map((restaurant) => {
                  const alerts = getAlerts(restaurant);
                  return (
                    <tr key={restaurant.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "14px 10px" }}><strong>{restaurant.name}</strong><div style={{ color: "#64748b", fontSize: 13 }}>{restaurant.slug || "-"}</div></td>
                      <td style={{ padding: "14px 10px" }}>{restaurant.owner?.name || "-"}<div style={{ color: "#64748b", fontSize: 13 }}>{restaurant.owner?.email || "-"}</div></td>
                      <td style={{ padding: "14px 10px" }}>
                        <select value={restaurant.plan || "starter"} onChange={(e) => updateRestaurant(restaurant.id, { plan: e.target.value })} disabled={savingId === restaurant.id} style={{ ...inputStyle(), minWidth: 130 }}>
                          <option value="starter">starter</option><option value="growth">growth</option><option value="enterprise">enterprise</option>
                        </select>
                      </td>
                      <td style={{ padding: "14px 10px" }}><span style={{ display: "inline-block", padding: "6px 10px", borderRadius: 999, background: restaurant.isActive ? "#dcfce7" : "#fee2e2", color: restaurant.isActive ? "#166534" : "#991b1b", fontWeight: 800, fontSize: 13 }}>{getStatusLabel(restaurant)}</span></td>
                      <td style={{ padding: "14px 10px", color: "#334155" }}>Menu {restaurant.counts?.menuItems || 0} · Tavoli {restaurant.counts?.tables || 0} · Ordini {restaurant.counts?.orders || 0}</td>
                      <td style={{ padding: "14px 10px" }}>{alerts.length ? alerts.map(a => <span key={a} style={{ display: "inline-block", margin: "2px", padding: "5px 8px", borderRadius: 999, background: "#fff7ed", color: "#9a3412", fontSize: 12, fontWeight: 800 }}>{a}</span>) : <span style={{ color: "#16a34a", fontWeight: 800 }}>OK</span>}</td>
                      <td style={{ padding: "14px 10px" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => openManagement(restaurant)} disabled={savingId === restaurant.id} style={primaryButton}>Apri gestione</button>
                          <button onClick={() => setSelected(restaurant)} style={buttonStyle}>Dettagli</button>
                          <button onClick={() => updateRestaurant(restaurant.id, { isActive: !restaurant.isActive })} disabled={savingId === restaurant.id} style={{ ...buttonStyle, color: restaurant.isActive ? "#991b1b" : "#166534" }}>{restaurant.isActive ? "Sospendi" : "Riattiva"}</button>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.42)", display: "grid", placeItems: "center", padding: 20, zIndex: 2000 }}>
          <div style={{ ...cardStyle, width: "min(720px, 96vw)", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div><h2 style={{ marginTop: 0 }}>{selected.name}</h2><p style={{ color: "#64748b" }}>{selected.slug}</p></div>
              <button onClick={() => setSelected(null)} style={buttonStyle}>Chiudi</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>Nome<input defaultValue={selected.name} onBlur={(e) => e.target.value !== selected.name && updateRestaurant(selected.id, { name: e.target.value })} style={inputStyle()} /></label>
              <label>Slug<input defaultValue={selected.slug} onBlur={(e) => e.target.value !== selected.slug && updateRestaurant(selected.id, { slug: e.target.value })} style={inputStyle()} /></label>
            </div>
            <h3>Utenti</h3>
            {(selected.users || []).map(user => <div key={user.id} style={{ padding: "10px 0", borderTop: "1px solid #e2e8f0" }}><strong>{user.name}</strong> · {user.email} · {user.role} · {user.isActive ? "attivo" : "disattivo"}</div>)}
            <h3>Numeri</h3>
            <p>Menu: {selected.counts?.menuItems || 0} · Tavoli: {selected.counts?.tables || 0} · Ordini: {selected.counts?.orders || 0} · Utenti: {selected.counts?.users || 0}</p>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.42)", display: "grid", placeItems: "center", padding: 20, zIndex: 2000 }}>
          <form onSubmit={createRestaurant} style={{ ...cardStyle, width: "min(760px, 96vw)", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div><h2 style={{ marginTop: 0 }}>Nuovo ristorante</h2><p style={{ color: "#64748b" }}>Crea cliente, owner e tavoli iniziali.</p></div>
              <button type="button" onClick={() => setShowCreate(false)} style={buttonStyle}>Chiudi</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>Nome ristorante<input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} style={inputStyle()} /></label>
              <label>Slug opzionale<input value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })} style={inputStyle()} /></label>
              <label>Nome owner<input required value={createForm.ownerName} onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })} style={inputStyle()} /></label>
              <label>Email owner<input required type="email" value={createForm.ownerEmail} onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })} style={inputStyle()} /></label>
              <label>Password iniziale<input required value={createForm.ownerPassword} onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })} style={inputStyle()} /></label>
              <label>Piano<select value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })} style={inputStyle()}><option value="starter">starter</option><option value="growth">growth</option><option value="enterprise">enterprise</option></select></label>
              <label>Tavoli iniziali<input type="number" min="0" max="80" value={createForm.tablesCount} onChange={(e) => setCreateForm({ ...createForm, tablesCount: e.target.value })} style={inputStyle()} /></label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setShowCreate(false)} style={buttonStyle}>Annulla</button>
              <button type="submit" disabled={savingId === "create"} style={primaryButton}>{savingId === "create" ? "Creo..." : "Crea ristorante"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
