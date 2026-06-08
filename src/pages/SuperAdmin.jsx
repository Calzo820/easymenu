import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { apiGet } from "../lib/api.js";

function fmtDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function StatCard({ label, value, hint }) {
  return (
    <div className="em-card" style={{ padding: 18 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>{label}</p>
      <strong style={{ display: "block", marginTop: 16, fontSize: 28, color: "#0f172a" }}>{value ?? "-"}</strong>
      <span style={{ display: "block", marginTop: 10, color: "#64748b", fontSize: 14 }}>{hint}</span>
    </div>
  );
}

export default function SuperAdmin() {
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRestaurants() {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/restaurants/super-admin");
      setRestaurants(Array.isArray(data?.restaurants) ? data.restaurants : []);
      setStats(data?.stats || null);
    } catch (err) {
      setError(err?.message || "Errore durante il caricamento dei ristoranti");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return restaurants.filter((item) => {
      const matchesQuery =
        !needle ||
        item.name?.toLowerCase().includes(needle) ||
        item.slug?.toLowerCase().includes(needle) ||
        item.ownerEmail?.toLowerCase().includes(needle) ||
        item.ownerName?.toLowerCase().includes(needle);

      const matchesStatus =
        status === "all" ||
        (status === "active" && item.isActive) ||
        (status === "inactive" && !item.isActive);

      return matchesQuery && matchesStatus;
    });
  }, [restaurants, query, status]);

  return (
    <div>
      <Navbar />
      <main className="em-page">
        <section className="em-hero" style={{ padding: "26px 32px" }}>
          <p style={{ margin: 0, color: "#0f172a" }}>Super admin SaaS</p>
          <h1 style={{ margin: "10px 0 6px", color: "#0f172a" }}>Ristoranti, piani e stato servizio</h1>
          <p style={{ margin: 0 }}>Vista operativa per controllare clienti EasyMenu, account attivi, piani e dati principali.</p>
        </section>

        {error && (
          <div className="em-alert em-alert-danger" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}

        <section className="em-grid em-grid-5" style={{ marginBottom: 18 }}>
          <StatCard label="Ristoranti" value={stats?.restaurants ?? restaurants.length} hint="Totali in piattaforma" />
          <StatCard label="Attivi" value={stats?.activeRestaurants ?? restaurants.filter((r) => r.isActive).length} hint="Utilizzabili dai clienti" />
          <StatCard label="Sospesi" value={stats?.inactiveRestaurants ?? restaurants.filter((r) => !r.isActive).length} hint="Disattivati" />
          <StatCard label="Ordini" value={stats?.orders ?? restaurants.reduce((sum, r) => sum + (r.ordersCount || 0), 0)} hint="Storico complessivo" />
          <StatCard label="Tavoli" value={stats?.tables ?? restaurants.reduce((sum, r) => sum + (r.tablesCount || 0), 0)} hint="QR configurati" />
        </section>

        <section className="em-card" style={{ padding: 20 }}>
          <div className="em-section-head" style={{ alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: 0 }}>Lista ristoranti</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>Cerca, verifica owner, piano, stato e numeri principali.</p>
            </div>
            <button className="em-btn em-btn-secondary" onClick={loadRestaurants} disabled={loading}>
              {loading ? "Carico..." : "Aggiorna"}
            </button>
          </div>

          <div className="em-toolbar" style={{ margin: "18px 0" }}>
            <input
              className="em-input"
              placeholder="Cerca nome, slug, owner o email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select className="em-input" style={{ maxWidth: 220 }} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tutti</option>
              <option value="active">Solo attivi</option>
              <option value="inactive">Solo sospesi</option>
            </select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="em-table">
              <thead>
                <tr>
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
                {filtered.map((restaurant) => (
                  <tr key={restaurant.id}>
                    <td>
                      <strong>{restaurant.name || "-"}</strong>
                      <br />
                      <span style={{ color: "#64748b" }}>{restaurant.slug || "-"}</span>
                    </td>
                    <td>
                      {restaurant.ownerName || "-"}
                      <br />
                      <span style={{ color: "#64748b" }}>{restaurant.ownerEmail || "-"}</span>
                    </td>
                    <td>{restaurant.plan || "starter"}</td>
                    <td>
                      <span className={restaurant.isActive ? "em-badge em-badge-success" : "em-badge em-badge-danger"}>
                        {restaurant.isActive ? "Attivo" : "Sospeso"}
                      </span>
                    </td>
                    <td>
                      {restaurant.menuItemsCount || 0} prodotti · {restaurant.tablesCount || 0} tavoli · {restaurant.ordersCount || 0} ordini
                    </td>
                    <td>{fmtDate(restaurant.createdAt)}</td>
                    <td>
                      <a className="em-btn em-btn-secondary" href="/admin">
                        Apri admin
                      </a>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="7">Nessun ristorante trovato.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan="7">Caricamento ristoranti...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
