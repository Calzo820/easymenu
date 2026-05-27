import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiGet } from "../lib/api";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";

function getRestaurantName() {
  return localStorage.getItem("ristorante_attivo") || "Ristorante";
}

const card = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
};

const primaryAction = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  minHeight: 76,
  padding: "18px 20px",
  background: "#0f172a",
  color: "white",
  borderRadius: 18,
  fontWeight: 900,
  textDecoration: "none",
};

const secondaryAction = {
  ...primaryAction,
  background: "white",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
};

function ActionCard({ to, title, text, primary = false }) {
  return (
    <Link to={to} style={primary ? primaryAction : secondaryAction}>
      <span>
        <span style={{ display: "block", fontSize: 20 }}>{title}</span>
        <span style={{ display: "block", marginTop: 4, fontSize: 13, opacity: primary ? 0.82 : 0.64 }}>
          {text}
        </span>
      </span>
      <span style={{ fontSize: 22 }}>→</span>
    </Link>
  );
}

function Guide() {
  const [open, setOpen] = useState(() => localStorage.getItem("dashboard_guide_collapsed") !== "1");

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem("dashboard_guide_collapsed", next ? "0" : "1");
  }

  return (
    <div style={card}>
      <button
        onClick={toggle}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          padding: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span>
          <span style={{ display: "block", fontSize: 18, fontWeight: 950 }}>Guida rapida</span>
          <span style={{ display: "block", marginTop: 4, color: "#64748b", fontWeight: 700, fontSize: 13 }}>
            Sempre disponibile se il cliente si perde.
          </span>
        </span>
        <span style={{ fontWeight: 950 }}>{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div style={{ marginTop: 16, display: "grid", gap: 10, color: "#334155", lineHeight: 1.45, fontWeight: 650 }}>
          <div><b>1.</b> Crea i tavoli da <b>Tavoli & QR</b> e stampa/scarica i QR.</div>
          <div><b>2.</b> Carica piatti e bevande nel <b>Menu</b>.</div>
          <div><b>3.</b> Usa <b>Cucina</b> e <b>Bar</b> per preparare gli ordini.</div>
          <div><b>4.</b> Usa <b>Cassa</b> per chiudere tavoli e pagamenti.</div>
          <div><b>5.</b> Controlla numeri e vendite solo in <b>Statistiche</b>.</div>
        </div>
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEssentials() {
      try {
        const [restaurantData, tablesData] = await Promise.all([
          apiGet("/restaurants/me"),
          apiGet("/tables"),
        ]);

        if (!active) return;
        setRestaurant(restaurantData || null);
        setTables(Array.isArray(tablesData) ? tablesData : []);
        setError("");
      } catch (err) {
        if (active) setError(err.message || "Impossibile caricare la dashboard");
      }
    }

    loadEssentials();

    return () => {
      active = false;
    };
  }, []);

  const firstActiveTable = useMemo(() => tables.find((table) => table.isActive), [tables]);
  const menuPreviewLink =
    restaurant?.slug && firstActiveTable?.qrToken
      ? `/menu/${restaurant.slug}/${firstActiveTable.qrToken}`
      : "/tavoli";

  return (
    <div style={glowPageStyle}>
      <Navbar />

      <div style={appShellStyle}>
        <div className="app-shell" style={{ display: "grid", gap: 14 }}>
          <div className="glass-hero em-compact-hero">
            <div className="topbar-chip">Dashboard</div>
            <h1 style={{ margin: "8px 0 0", fontSize: 28, lineHeight: 1.1 }}>
              {restaurant?.name || getRestaurantName()}
            </h1>
            <p style={{ margin: "8px 0 0", color: "#475569", maxWidth: 720 }}>
              Accesso rapido alle funzioni operative. I numeri dettagliati sono nelle pagine dedicate.
            </p>
          </div>

          {error ? (
            <div style={{ ...card, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>
              {error}
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <ActionCard to="/tavoli" title="Tavoli & QR" text="Crea tavoli, copia link e stampa QR." primary />
            <ActionCard to={menuPreviewLink} title="Vedi menu" text="Anteprima cliente da QR reale." />
            <ActionCard to="/cucina" title="Cucina" text="Comande cucina in tempo reale." />
            <ActionCard to="/bar" title="Bar" text="Bevande e banco separati." />
            <ActionCard to="/cassa" title="Cassa" text="Conti, pagamenti e chiusure." />
            <ActionCard to="/statistiche" title="Statistiche" text="Vendite, ticket medio e prodotti top." />
          </div>

          <Guide />

          <div style={{ ...card, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Configurazione essenziale</div>
              <div style={{ color: "#64748b", marginTop: 4, fontWeight: 700 }}>
                Tavoli attivi: {tables.filter((table) => table.isActive).length}. Se il menu non si apre, genera/usa il QR da Tavoli & QR.
              </div>
            </div>
            <Link to="/tavoli" style={{ color: "#1d4ed8", fontWeight: 950 }}>
              Controlla QR →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
