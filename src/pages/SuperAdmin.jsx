import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const planLabel = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

export default function SuperAdmin() {
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    starter: 0,
    growth: 0,
    enterprise: 0,
  });
  const [query, setQuery] = useState("");
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadRestaurants() {
    try {
      setErrore("");
      setLoading(true);
      const data = await apiGet("/restaurants/super-admin");
      setRestaurants(Array.isArray(data?.restaurants) ? data.restaurants : []);
      setStats(data?.stats || {});
    } catch (error) {
      setErrore(error.message || "Errore durante il caricamento dei ristoranti.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  const filteredRestaurants = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return restaurants;

    return restaurants.filter((restaurant) => {
      return [
        restaurant.name,
        restaurant.slug,
        restaurant.plan,
        restaurant.ownerEmail,
        restaurant.subscriptionStatus,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value));
    });
  }, [restaurants, query]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }}>
      <header
        style={{
          background: "#0f172a",
          color: "white",
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800, letterSpacing: 1 }}>
            EASYMENU SAAS
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 24 }}>Super Admin</h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/dashboard" style={buttonStyle("dark")}>Dashboard</Link>
          <Link to="/admin" style={buttonStyle("dark")}>Admin ristorante</Link>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: 22 }}>
        {errore ? (
          <div style={alertStyle}>
            <strong>Errore:</strong> {errore}
          </div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <StatCard label="Ristoranti" value={stats.total || 0} />
          <StatCard label="Attivi" value={stats.active || 0} />
          <StatCard label="Disattivi" value={stats.inactive || 0} />
          <StatCard label="Starter" value={stats.starter || 0} />
          <StatCard label="Growth" value={stats.growth || 0} />
          <StatCard label="Enterprise" value={stats.enterprise || 0} />
        </section>

        <section style={panelStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Ristoranti registrati</h2>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
                Vista SaaS riservata alle email presenti in SUPER_ADMIN_EMAILS.
              </p>
            </div>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca nome, slug, piano, owner..."
              style={{
                minWidth: 280,
                maxWidth: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "11px 12px",
                fontWeight: 700,
              }}
            />
          </div>

          {loading ? (
            <div style={{ padding: 24, fontWeight: 800, color: "#334155" }}>
              Caricamento ristoranti...
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div style={{ padding: 24, color: "#64748b" }}>
              Nessun ristorante trovato.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    <Th>Ristorante</Th>
                    <Th>Stato</Th>
                    <Th>Piano</Th>
                    <Th>Owner</Th>
                    <Th>Utenti</Th>
                    <Th>Ordini</Th>
                    <Th>Creato</Th>
                    <Th>Azioni</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <Td>
                        <strong>{restaurant.name}</strong>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{restaurant.slug}</div>
                      </Td>
                      <Td>
                        <span style={pillStyle(restaurant.isActive ? "green" : "red")}>
                          {restaurant.isActive ? "Attivo" : "Disattivo"}
                        </span>
                      </Td>
                      <Td>
                        <span style={pillStyle("blue")}>
                          {planLabel[restaurant.plan] || restaurant.plan || "—"}
                        </span>
                        {restaurant.subscriptionStatus ? (
                          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                            {restaurant.subscriptionStatus}
                          </div>
                        ) : null}
                      </Td>
                      <Td>
                        <div>{restaurant.ownerName || "—"}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{restaurant.ownerEmail || "—"}</div>
                      </Td>
                      <Td>{restaurant.usersCount ?? 0}</Td>
                      <Td>{restaurant.ordersCount ?? 0}</Td>
                      <Td>{formatDate(restaurant.createdAt)}</Td>
                      <Td>
                        <a
                          href={`/admin?restaurantId=${encodeURIComponent(restaurant.id)}`}
                          style={buttonStyle()}
                        >
                          Apri
                        </a>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={panelStyle}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 28, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding: "12px 10px", fontSize: 12, color: "#475569" }}>{children}</th>;
}

function Td({ children }) {
  return <td style={{ padding: "12px 10px", verticalAlign: "top" }}>{children}</td>;
}

function pillStyle(kind) {
  const styles = {
    green: { background: "#dcfce7", color: "#166534" },
    red: { background: "#fee2e2", color: "#991b1b" },
    blue: { background: "#dbeafe", color: "#1d4ed8" },
  };

  return {
    display: "inline-flex",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 12,
    fontWeight: 900,
    ...(styles[kind] || styles.blue),
  };
}

function buttonStyle(kind) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    padding: "9px 12px",
    background: kind === "dark" ? "rgba(255,255,255,0.12)" : "#2563eb",
    color: "white",
    textDecoration: "none",
    fontWeight: 900,
    border: kind === "dark" ? "1px solid rgba(255,255,255,0.2)" : "none",
  };
}

const panelStyle = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
};

const alertStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  borderRadius: 14,
  padding: 14,
  marginBottom: 14,
  fontWeight: 800,
};
