import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";

const statusLabels = {
  true: "Attivo",
  false: "Sospeso",
};

function formatDate(value) {
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

export default function SuperAdmin() {
  const [restaurants, setRestaurants] = useState([]);
  const [summary, setSummary] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRestaurants = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/restaurants/super-admin");
      setRestaurants(Array.isArray(data?.restaurants) ? data.restaurants : []);
      setSummary(data?.summary || null);
    } catch (err) {
      setError(err?.message || "Impossibile caricare i ristoranti");
      setRestaurants([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesStatus =
        status === "all" ||
        (status === "active" && restaurant.isActive) ||
        (status === "suspended" && !restaurant.isActive);

      const haystack = [
        restaurant.name,
        restaurant.slug,
        restaurant.owner?.name,
        restaurant.owner?.email,
        restaurant.plan,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [restaurants, query, status]);

  const cards = [
    {
      label: "Ristoranti",
      value: summary?.restaurants ?? restaurants.length,
      help: "Totali in piattaforma",
    },
    {
      label: "Attivi",
      value: summary?.activeRestaurants ?? restaurants.filter((item) => item.isActive).length,
      help: "Utilizzabili dai clienti",
    },
    {
      label: "Sospesi",
      value: summary?.suspendedRestaurants ?? restaurants.filter((item) => !item.isActive).length,
      help: "Disattivati",
    },
    {
      label: "Ordini",
      value: summary?.orders ?? "-",
      help: "Storico complessivo",
    },
    {
      label: "Tavoli",
      value: summary?.tables ?? "-",
      help: "QR configurati",
    },
  ];

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Super admin SaaS</p>
        <h1>Ristoranti, piani e stato servizio</h1>
        <p>Vista operativa per controllare clienti EasyMenu, account attivi, piani e dati principali.</p>
      </section>

      {error && <div className="alert alert-danger">{error}</div>}

      <section className="kpi-grid">
        {cards.map((card) => (
          <article key={card.label} className="kpi-card">
            <span>{card.label}</span>
            <strong>{loading ? "..." : card.value}</strong>
            <small>{card.help}</small>
          </article>
        ))}
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h2>Lista ristoranti</h2>
            <p>Cerca, verifica owner, piano, stato e numeri principali.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={loadRestaurants} disabled={loading}>
            {loading ? "Carico..." : "Aggiorna"}
          </button>
        </div>

        <div className="filters-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca nome, slug, owner o email"
            aria-label="Cerca ristoranti"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtra stato">
            <option value="all">Tutti</option>
            <option value="active">Attivi</option>
            <option value="suspended">Sospesi</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
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
              {loading ? (
                <tr>
                  <td colSpan="7">Caricamento ristoranti...</td>
                </tr>
              ) : filteredRestaurants.length ? (
                filteredRestaurants.map((restaurant) => (
                  <tr key={restaurant.id}>
                    <td>
                      <strong>{restaurant.name || "Senza nome"}</strong>
                      <small>{restaurant.slug || "-"}</small>
                    </td>
                    <td>
                      <strong>{restaurant.owner?.name || "-"}</strong>
                      <small>{restaurant.owner?.email || "-"}</small>
                    </td>
                    <td>{restaurant.plan || "starter"}</td>
                    <td>
                      <span className={restaurant.isActive ? "status-pill success" : "status-pill danger"}>
                        {statusLabels[String(Boolean(restaurant.isActive))]}
                      </span>
                    </td>
                    <td>
                      <small>
                        Menu: {restaurant.counts?.menuItems ?? 0} · Tavoli: {restaurant.counts?.tables ?? 0} · Ordini:{" "}
                        {restaurant.counts?.orders ?? 0}
                      </small>
                    </td>
                    <td>{formatDate(restaurant.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          localStorage.setItem("restaurant_id", restaurant.id);
                          localStorage.setItem("restaurant_slug", restaurant.slug || "");
                          window.location.href = "/admin";
                        }}
                      >
                        Apri
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">Nessun ristorante trovato.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
