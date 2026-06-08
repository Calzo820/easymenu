import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { apiGet } from "../lib/api";

const cardStyle = {
  background: "rgba(255,255,255,0.86)",
  border: "1px solid rgba(148,163,184,0.22)",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
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

function getStatusLabel(restaurant) {
  if (!restaurant?.isActive) return "Sospeso";
  const status = restaurant?.subscription?.status;
  if (status === "past_due" || status === "unpaid") return "Pagamento richiesto";
  if (status === "canceled") return "Disdetto";
  return "Attivo";
}

export default function SuperAdmin() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const stats = useMemo(() => {
    return restaurants.reduce(
      (acc, restaurant) => {
        acc.total += 1;
        if (restaurant.isActive) acc.active += 1;
        else acc.suspended += 1;
        acc.orders += restaurant.counts?.orders || 0;
        acc.tables += restaurant.counts?.tables || 0;
        return acc;
      },
      { total: 0, active: 0, suspended: 0, orders: 0, tables: 0 }
    );
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const status = getStatusLabel(restaurant).toLowerCase();
      const owner = restaurant.owner?.email || restaurant.owner?.name || "";
      const haystack = `${restaurant.name} ${restaurant.slug} ${owner}`.toLowerCase();

      if (statusFilter !== "all") {
        if (statusFilter === "active" && !restaurant.isActive) return false;
        if (statusFilter === "suspended" && restaurant.isActive) return false;
      }

      return !q || haystack.includes(q);
    });
  }, [restaurants, query, statusFilter]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#eef6ff,#f8fbff)" }}>
      <Navbar />

      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 24px 72px" }}>
        <section style={{ marginBottom: 24 }}>
          <div style={{ color: "#0f172a", fontSize: 16, marginBottom: 8 }}>Super admin SaaS</div>
          <h1 style={{ margin: 0, fontSize: 36, color: "#061638" }}>Ristoranti, piani e stato servizio</h1>
          <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 17 }}>
            Pannello piattaforma: qui controlli tutti i clienti EasyMenu, senza essere legato a un singolo ristorante.
          </p>
        </section>

        {errore && (
          <div style={{ ...cardStyle, borderColor: "#fecaca", color: "#b91c1c", marginBottom: 18 }}>
            {errore}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 18,
          }}
        >
          {[
            ["RISTORANTI", stats.total, "Totali in piattaforma"],
            ["ATTIVI", stats.active, "Utilizzabili dai clienti"],
            ["SOSPESI", stats.suspended, "Disattivati"],
            ["ORDINI", stats.orders, "Storico complessivo"],
            ["TAVOLI", stats.tables, "QR configurati"],
          ].map(([label, value, hint]) => (
            <div key={label} style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#64748b", letterSpacing: 0.8 }}>{label}</div>
              <div style={{ fontSize: 30, fontWeight: 950, color: "#061638", marginTop: 18 }}>{value}</div>
              <div style={{ color: "#64748b", marginTop: 8 }}>{hint}</div>
            </div>
          ))}
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 28, color: "#061638" }}>Lista ristoranti</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                Cerca, verifica owner, piano, stato e numeri principali.
              </p>
            </div>
            <button onClick={loadRestaurants} style={{ padding: "12px 16px", borderRadius: 12, cursor: "pointer" }}>
              Aggiorna
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12, marginTop: 18 }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca nome, slug, owner o email"
              style={{ padding: 14, borderRadius: 14, border: "1px solid #dbeafe", fontSize: 16 }}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ padding: 14, borderRadius: 14, border: "1px solid #dbeafe", fontSize: 16 }}
            >
              <option value="all">Tutti</option>
              <option value="active">Solo attivi</option>
              <option value="suspended">Solo sospesi</option>
            </select>
          </div>

          <div style={{ overflowX: "auto", marginTop: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#475569", fontSize: 14 }}>
                  <th style={{ padding: "12px 10px" }}>Ristorante</th>
                  <th style={{ padding: "12px 10px" }}>Owner</th>
                  <th style={{ padding: "12px 10px" }}>Piano</th>
                  <th style={{ padding: "12px 10px" }}>Stato</th>
                  <th style={{ padding: "12px 10px" }}>Numeri</th>
                  <th style={{ padding: "12px 10px" }}>Creato</th>
                  <th style={{ padding: "12px 10px" }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="7" style={{ padding: 18 }}>Caricamento ristoranti...</td>
                  </tr>
                )}

                {!loading && filteredRestaurants.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: 18 }}>Nessun ristorante trovato.</td>
                  </tr>
                )}

                {!loading &&
                  filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "14px 10px" }}>
                        <strong>{restaurant.name}</strong>
                        <div style={{ color: "#64748b", fontSize: 13 }}>{restaurant.slug || "-"}</div>
                      </td>
                      <td style={{ padding: "14px 10px" }}>
                        {restaurant.owner?.name || "-"}
                        <div style={{ color: "#64748b", fontSize: 13 }}>{restaurant.owner?.email || "-"}</div>
                      </td>
                      <td style={{ padding: "14px 10px" }}>{restaurant.plan || "-"}</td>
                      <td style={{ padding: "14px 10px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: restaurant.isActive ? "#dcfce7" : "#fee2e2",
                            color: restaurant.isActive ? "#166534" : "#991b1b",
                            fontWeight: 800,
                            fontSize: 13,
                          }}
                        >
                          {getStatusLabel(restaurant)}
                        </span>
                      </td>
                      <td style={{ padding: "14px 10px", color: "#334155" }}>
                        Menu {restaurant.counts?.menuItems || 0} · Tavoli {restaurant.counts?.tables || 0} · Ordini{" "}
                        {restaurant.counts?.orders || 0}
                      </td>
                      <td style={{ padding: "14px 10px" }}>{formatDate(restaurant.createdAt)}</td>
                      <td style={{ padding: "14px 10px" }}>
                        <button disabled style={{ padding: "8px 10px", borderRadius: 10 }}>
                          Apri gestione
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
