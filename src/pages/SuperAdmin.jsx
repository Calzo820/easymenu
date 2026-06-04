import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api.js";

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
  const status = restaurant?.subscription?.status || restaurant?.subscriptionStatus;
  if (status && !["active", "trialing"].includes(status)) return status;
  return "Attivo";
}

export default function SuperAdmin() {
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadRestaurants() {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/restaurants/super-admin");
      const list = Array.isArray(data) ? data : data?.restaurants || [];
      setRestaurants(list);
      setStats(data?.stats || null);
    } catch (err) {
      setError(err?.message || "Impossibile caricare i ristoranti");
      setRestaurants([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const status = getStatusLabel(restaurant).toLowerCase();
      const owner = restaurant.owner?.email || restaurant.ownerEmail || "";
      const haystack = [
        restaurant.name,
        restaurant.slug,
        owner,
        restaurant.owner?.name,
        restaurant.plan,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const textOk = !text || haystack.includes(text);
      const statusOk = statusFilter === "all" || status === statusFilter;
      return textOk && statusOk;
    });
  }, [restaurants, query, statusFilter]);

  const totalRestaurants = stats?.totalRestaurants ?? restaurants.length;
  const activeRestaurants = stats?.activeRestaurants ?? restaurants.filter((r) => r.isActive).length;
  const suspendedRestaurants = stats?.suspendedRestaurants ?? restaurants.filter((r) => !r.isActive).length;
  const totalOrders = stats?.totalOrders ?? restaurants.reduce((sum, r) => sum + Number(r.counts?.orders || r.ordersCount || 0), 0);
  const totalTables = stats?.totalTables ?? restaurants.reduce((sum, r) => sum + Number(r.counts?.tables || r.tablesCount || 0), 0);

  return (
    <main style={{ padding: "32px min(5vw, 56px)" }}>
      <section style={{ marginBottom: 28 }}>
        <p style={{ margin: "0 0 8px", fontSize: 18 }}>Super admin SaaS</p>
        <h1 style={{ margin: 0, fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.05 }}>
          Ristoranti, piani e stato servizio
        </h1>
        <p style={{ marginTop: 8, color: "white", fontSize: 18 }}>
          Vista operativa per controllare clienti EasyMenu, account attivi, piani e dati principali.
        </p>
      </section>

      {error ? (
        <div style={{
          background: "rgba(255,255,255,.82)",
          border: "1px solid #fecaca",
          color: "#b91c1c",
          borderRadius: 18,
          padding: "16px 20px",
          marginBottom: 18,
          fontSize: 18,
        }}>
          {error}
        </div>
      ) : null}

      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(140px, 1fr))",
        gap: 14,
        marginBottom: 18,
      }}>
        {[
          ["Ristoranti", totalRestaurants, "Totali in piattaforma"],
          ["Attivi", activeRestaurants, "Utilizzabili dai clienti"],
          ["Sospesi", suspendedRestaurants, "Disattivati"],
          ["Ordini", totalOrders, "Storico complessivo"],
          ["Tavoli", totalTables, "QR configurati"],
        ].map(([label, value, help]) => (
          <article key={label} style={{
            background: "rgba(255,255,255,.82)",
            borderRadius: 18,
            padding: 18,
            boxShadow: "0 14px 36px rgba(15,23,42,.08)",
          }}>
            <strong style={{ color: "#64748b", textTransform: "uppercase" }}>{label}</strong>
            <div style={{ fontSize: 30, fontWeight: 900, margin: "22px 0 8px" }}>
              {loading ? "..." : value}
            </div>
            <span style={{ color: "#64748b" }}>{help}</span>
          </article>
        ))}
      </section>

      <section style={{
        background: "rgba(255,255,255,.88)",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 18px 50px rgba(15,23,42,.10)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 30 }}>Lista ristoranti</h2>
            <p style={{ margin: "6px 0 16px", color: "#64748b", fontSize: 18 }}>
              Cerca, verifica owner, piano, stato e numeri principali.
            </p>
          </div>
          <button onClick={loadRestaurants} style={{ padding: "12px 18px", fontSize: 18, cursor: "pointer" }}>
            Aggiorna
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12, marginBottom: 18 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca nome, slug, owner o email"
            style={{ padding: 14, borderRadius: 14, border: "1px solid #dbeafe", fontSize: 18 }}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ padding: 14, borderRadius: 14, border: "1px solid #dbeafe", fontSize: 18 }}
          >
            <option value="all">Tutti</option>
            <option value="attivo">Attivi</option>
            <option value="sospeso">Sospesi</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ color: "#64748b", textAlign: "left" }}>
                <th style={{ padding: "12px 8px" }}>Ristorante</th>
                <th style={{ padding: "12px 8px" }}>Owner</th>
                <th style={{ padding: "12px 8px" }}>Piano</th>
                <th style={{ padding: "12px 8px" }}>Stato</th>
                <th style={{ padding: "12px 8px" }}>Numeri</th>
                <th style={{ padding: "12px 8px" }}>Creato</th>
                <th style={{ padding: "12px 8px" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: 22 }}>Caricamento...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: 22 }}>Nessun ristorante trovato.</td></tr>
              ) : (
                filtered.map((restaurant) => (
                  <tr key={restaurant.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "14px 8px" }}>
                      <strong>{restaurant.name || "Senza nome"}</strong>
                      <div style={{ color: "#64748b" }}>{restaurant.slug || "-"}</div>
                    </td>
                    <td style={{ padding: "14px 8px" }}>
                      {restaurant.owner?.name || restaurant.ownerName || "-"}
                      <div style={{ color: "#64748b" }}>{restaurant.owner?.email || restaurant.ownerEmail || "-"}</div>
                    </td>
                    <td style={{ padding: "14px 8px", textTransform: "capitalize" }}>
                      {restaurant.plan || restaurant.subscription?.plan || "starter"}
                    </td>
                    <td style={{ padding: "14px 8px" }}>
                      <strong>{getStatusLabel(restaurant)}</strong>
                    </td>
                    <td style={{ padding: "14px 8px" }}>
                      Ordini: {restaurant.counts?.orders ?? restaurant.ordersCount ?? 0}<br />
                      Tavoli: {restaurant.counts?.tables ?? restaurant.tablesCount ?? 0}<br />
                      Menu: {restaurant.counts?.menuItems ?? restaurant.menuItemsCount ?? 0}
                    </td>
                    <td style={{ padding: "14px 8px" }}>{formatDate(restaurant.createdAt)}</td>
                    <td style={{ padding: "14px 8px" }}>
                      <a href="/admin" style={{ color: "#1d4ed8", fontWeight: 800 }}>Apri admin</a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
