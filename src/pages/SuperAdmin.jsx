import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiGet, apiPost, setAuthToken } from "../lib/api";
import { appShellStyle, glowPageStyle } from "../styles/pageStyles";

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");

  async function loadRestaurants() {
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
    loadRestaurants();
  }, []);

  async function manageRestaurant(restaurantId) {
    try {
      setWorkingId(restaurantId);
      const data = await apiPost(`/super-admin/restaurants/${restaurantId}/impersonate`, {});
      if (!data?.token) throw new Error("Token ristorante non ricevuto");

      localStorage.setItem("superadmin_original_token", localStorage.getItem("auth_token") || "");
      setAuthToken(data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      localStorage.setItem("auth_restaurant", JSON.stringify(data.restaurant));
      localStorage.setItem("ristorante_attivo", data.restaurant?.name || "");
      localStorage.setItem("restaurant_slug", data.restaurant?.slug || "");
      localStorage.setItem("restaurant_id", data.restaurant?.id || "");
      localStorage.setItem("superadmin_mode", "1");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Errore apertura ristorante");
    } finally {
      setWorkingId("");
    }
  }

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div style={appShellStyle}>
        <div className="app-shell">
          <div className="section-card" style={{ marginBottom: 16 }}>
            <div className="panel-title">Super Admin</div>
            <div className="panel-subtitle" style={{ marginTop: 6 }}>
              Entra in qualsiasi ristorante e modifica menu, tavoli, personale, cucina, bar, cassa, statistiche e billing.
            </div>
          </div>

          {error ? <div style={errorBox}>{error}</div> : null}
          {loading ? <div className="section-card">Caricamento ristoranti...</div> : null}

          <div style={{ display: "grid", gap: 12 }}>
            {restaurants.map((restaurant) => (
              <div key={restaurant.id} className="section-card" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 950 }}>{restaurant.name}</div>
                  <div style={{ color: "#64748b", fontWeight: 750, marginTop: 4 }}>
                    {restaurant.slug} · {restaurant.usersCount || 0} utenti · {restaurant.menuItemsCount || 0} prodotti · {restaurant.tablesCount || 0} tavoli
                  </div>
                  {restaurant.ownerEmail ? <div style={{ color: "#64748b", marginTop: 4 }}>Owner: {restaurant.ownerEmail}</div> : null}
                </div>
                <button onClick={() => manageRestaurant(restaurant.id)} disabled={workingId === restaurant.id} style={primaryBtn}>
                  {workingId === restaurant.id ? "Apertura..." : "Gestisci tutto"}
                </button>
              </div>
            ))}
            {!loading && restaurants.length === 0 ? <div className="section-card">Nessun ristorante trovato.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const primaryBtn = {
  border: "none",
  borderRadius: 14,
  padding: "12px 16px",
  background: "#111827",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const errorBox = {
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  borderRadius: 16,
  padding: 14,
  marginBottom: 16,
  fontWeight: 800,
};
