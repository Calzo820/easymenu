import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiGet, apiPatch } from "../lib/api";
import { appShellStyle, glowPageStyle } from "../styles/pageStyles";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "-";
  }
}

function StatCard({ label, value, note }) {
  return (
    <div className="section-card" style={{ padding: 18, display: "grid", gap: 4 }}>
      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "#0f172a", fontSize: 30, fontWeight: 950 }}>{value}</div>
      {note ? <div style={{ color: "#64748b", fontSize: 13 }}>{note}</div> : null}
    </div>
  );
}

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [summary, setSummary] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  async function loadRestaurants() {
    try {
      setLoading(true);
      setError("");
      const data = await apiGet("/restaurants/super-admin");
      setSummary(data.summary || null);
      setRestaurants(Array.isArray(data.restaurants) ? data.restaurants : []);
    } catch (err) {
      setError(err.message || "Errore caricamento ristoranti");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const matchesQuery = !q || [restaurant.name, restaurant.slug, restaurant.owner?.email, restaurant.owner?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesStatus = status === "all" || (status === "active" ? restaurant.isActive : !restaurant.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [restaurants, query, status]);

  async function updateRestaurant(restaurant, payload) {
    try {
      setSavingId(restaurant.id);
      setError("");
      setSuccess("");
      await apiPatch(`/restaurants/super-admin/${restaurant.id}`, payload);
      setSuccess(`Ristorante ${restaurant.name} aggiornato`);
      await loadRestaurants();
    } catch (err) {
      setError(err.message || "Errore aggiornamento ristorante");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <main style={appShellStyle}>
        <section className="hero-card" style={{ padding: "18px 22px", marginBottom: 16 }}>
          <div className="eyebrow-pill">Super admin SaaS</div>
          <h1 style={{ margin: "10px 0 4px", color: "#0f172a" }}>Ristoranti, piani e stato servizio</h1>
          <p style={{ margin: 0, color: "white" }}>
            Vista operativa per controllare clienti EasyMenu, account attivi, piani e dati principali.
          </p>
        </section>

        {error ? <div className="section-card" style={{ border: "1px solid #fecaca", color: "#b91c1c", marginBottom: 14 }}>{error}</div> : null}
        {success ? <div className="section-card" style={{ border: "1px solid #bbf7d0", color: "#166534", marginBottom: 14 }}>{success}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
          <StatCard label="Ristoranti" value={summary?.total ?? "-"} note="Totali in piattaforma" />
          <StatCard label="Attivi" value={summary?.active ?? "-"} note="Utilizzabili dai clienti" />
          <StatCard label="Sospesi" value={summary?.suspended ?? "-"} note="Disattivati" />
          <StatCard label="Ordini" value={summary?.orders ?? "-"} note="Storico complessivo" />
          <StatCard label="Tavoli" value={summary?.tables ?? "-"} note="QR configurati" />
        </div>

        <div className="section-card" style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div className="panel-title">Lista ristoranti</div>
              <p style={{ margin: "4px 0 0", color: "#64748b" }}>Cerca, verifica owner, piano, stato e numeri principali.</p>
            </div>
            <button type="button" onClick={loadRestaurants} disabled={loading}>{loading ? "Carico..." : "Aggiorna"}</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 190px", gap: 10 }}>
            <input placeholder="Cerca nome, slug, owner o email" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Tutti</option>
              <option value="active">Solo attivi</option>
              <option value="suspended">Solo sospesi</option>
            </select>
          </div>

          {loading ? (
            <div>Caricamento ristoranti...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 10px" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#64748b", fontSize: 13 }}>
                    <th>Ristorante</th>
                    <th>Owner</th>
                    <th>Piano</th>
                    <th>Stato</th>
                    <th>Numeri</th>
                    <th>Creato</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} style={{ background: "white", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)" }}>
                      <td style={{ padding: 14, borderRadius: "16px 0 0 16px" }}>
                        <div style={{ fontWeight: 950, color: "#0f172a" }}>{restaurant.name || "Senza nome"}</div>
                        <div style={{ color: "#64748b", fontSize: 13 }}>/{restaurant.slug || "-"}</div>
                      </td>
                      <td style={{ padding: 14 }}>
                        <div style={{ fontWeight: 800 }}>{restaurant.owner?.name || "-"}</div>
                        <div style={{ color: "#64748b", fontSize: 13 }}>{restaurant.owner?.email || "-"}</div>
                      </td>
                      <td style={{ padding: 14 }}>
                        <select
                          value={restaurant.plan || "starter"}
                          disabled={savingId === restaurant.id}
                          onChange={(e) => updateRestaurant(restaurant, { plan: e.target.value })}
                        >
                          <option value="starter">starter</option>
                          <option value="growth">growth</option>
                          <option value="enterprise">enterprise</option>
                        </select>
                      </td>
                      <td style={{ padding: 14 }}>
                        <span style={{ fontWeight: 950, color: restaurant.isActive ? "#15803d" : "#b91c1c" }}>
                          {restaurant.isActive ? "Attivo" : "Sospeso"}
                        </span>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          {restaurant.subscription?.status ? `Stripe: ${restaurant.subscription.status}` : "No subscription"}
                        </div>
                      </td>
                      <td style={{ padding: 14, color: "#334155", fontSize: 13 }}>
                        <div>Menu: <b>{restaurant.counts?.menuItems || 0}</b></div>
                        <div>Tavoli: <b>{restaurant.counts?.tables || 0}</b></div>
                        <div>Ordini: <b>{restaurant.counts?.orders || 0}</b></div>
                        <div>Utenti: <b>{restaurant.counts?.users || 0}</b></div>
                      </td>
                      <td style={{ padding: 14, color: "#64748b", fontSize: 13 }}>{formatDate(restaurant.createdAt)}</td>
                      <td style={{ padding: 14, borderRadius: "0 16px 16px 0" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            disabled={savingId === restaurant.id}
                            onClick={() => updateRestaurant(restaurant, { isActive: !restaurant.isActive })}
                          >
                            {restaurant.isActive ? "Sospendi" : "Riattiva"}
                          </button>
                          {restaurant.slug ? (
                            <a className="button-like" href={`/menu/${restaurant.slug}`} target="_blank" rel="noreferrer">Menu</a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRestaurants.length === 0 ? <div style={{ padding: 20 }}>Nessun ristorante trovato.</div> : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
