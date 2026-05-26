import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiGet, apiPost, setAuthToken } from "../lib/api";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";

function countLabel(value, singular, plural) {
  const n = Number(value || 0);
  return `${n} ${n === 1 ? singular : plural}`;
}

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await apiGet("/super-admin/restaurants");
      setRestaurants(Array.isArray(data?.restaurants) ? data.restaurants : []);
      setError("");
    } catch (err) {
      setError(err.message || "Errore caricamento ristoranti");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function manageRestaurant(restaurantId) {
    try {
      setOpeningId(restaurantId);

      if (!localStorage.getItem("super_admin_original_token")) {
        localStorage.setItem("super_admin_original_token", localStorage.getItem("auth_token") || "");
        localStorage.setItem("super_admin_original_user", localStorage.getItem("auth_user") || "");
      }

      const data = await apiPost(`/super-admin/restaurants/${restaurantId}/impersonate`, {});
      if (!data?.token || !data?.restaurant) throw new Error("Token di gestione non ricevuto");

      setAuthToken(data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      localStorage.setItem("auth_restaurant", JSON.stringify(data.restaurant));
      localStorage.setItem("ristorante_attivo", data.restaurant.name || "");
      localStorage.setItem("restaurant_slug", data.restaurant.slug || "");
      localStorage.setItem("restaurant_id", data.restaurant.id || "");
      localStorage.setItem("super_admin_impersonating", "1");

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Errore apertura ristorante");
    } finally {
      setOpeningId("");
    }
  }

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <main style={appShellStyle}>
        <section className="glass-hero" style={{ marginBottom: 18 }}>
          <div className="topbar-chip" style={{ marginBottom: 12 }}>
            Pannello piattaforma
          </div>
          <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05 }}>Super Admin</h1>
          <p style={{ maxWidth: 760, lineHeight: 1.6, opacity: 0.95 }}>
            Da qui vedi tutti i ristoranti e puoi entrare in ognuno con permessi completi:
            menu, tavoli, personale, ordini, cassa, cucina, bar, statistiche e impostazioni.
          </p>
        </section>

        {error ? (
          <div className="section-card" style={{ marginBottom: 16, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}>
            {error}
          </div>
        ) : null}

        <div className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div className="panel-title">Ristoranti collegati</div>
              <div className="panel-subtitle">Seleziona “Gestisci” per aprire la dashboard completa del ristorante.</div>
            </div>
            <button onClick={load} disabled={loading} style={{ border: 0, borderRadius: 14, padding: "12px 16px", background: "#111827", color: "white", fontWeight: 900, cursor: "pointer" }}>
              Aggiorna
            </button>
          </div>

          {loading ? (
            <div style={{ fontWeight: 800, color: "#64748b" }}>Caricamento...</div>
          ) : restaurants.length === 0 ? (
            <div style={{ color: "#64748b", fontWeight: 800 }}>Nessun ristorante trovato.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {restaurants.map((restaurant) => (
                <div key={restaurant.id} style={{ border: "1px solid #e2e8f0", borderRadius: 22, padding: 18, background: "white", boxShadow: "0 12px 28px rgba(15,23,42,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 950, color: "#0f172a" }}>{restaurant.name}</div>
                      <div style={{ marginTop: 4, color: "#64748b", fontWeight: 800 }}>{restaurant.slug}</div>
                    </div>
                    <span style={{ borderRadius: 999, padding: "6px 10px", background: restaurant.isActive ? "#dcfce7" : "#fee2e2", color: restaurant.isActive ? "#166534" : "#991b1b", fontWeight: 900, fontSize: 12 }}>
                      {restaurant.isActive ? "Attivo" : "Disattivo"}
                    </span>
                  </div>

                  <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, color: "#334155", fontWeight: 800, fontSize: 13 }}>
                    <div>{countLabel(restaurant._count?.users, "utente", "utenti")}</div>
                    <div>{countLabel(restaurant._count?.menuItems, "prodotto", "prodotti")}</div>
                    <div>{countLabel(restaurant._count?.tables, "tavolo", "tavoli")}</div>
                    <div>{countLabel(restaurant._count?.orders, "ordine", "ordini")}</div>
                  </div>

                  <button
                    onClick={() => manageRestaurant(restaurant.id)}
                    disabled={openingId === restaurant.id}
                    style={{ marginTop: 18, width: "100%", border: 0, borderRadius: 16, padding: "14px 16px", background: "linear-gradient(135deg,#2563eb,#0891b2)", color: "white", fontWeight: 950, cursor: "pointer", opacity: openingId === restaurant.id ? 0.7 : 1 }}
                  >
                    {openingId === restaurant.id ? "Apertura..." : "Gestisci tutto"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
