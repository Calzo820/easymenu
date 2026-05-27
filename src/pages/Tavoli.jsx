import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Navbar from "../components/Navbar";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";

const card = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
};

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  padding: "12px 14px",
  minHeight: 44,
};

const primaryButton = {
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  minHeight: 44,
  background: "#0f172a",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const lightButton = {
  ...primaryButton,
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
};

function normalizeTableNumber(value) {
  return String(value || "").trim().replace(/[^\w-]/g, "").toUpperCase();
}

export default function Tavoli() {
  const [tables, setTables] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const baseUrl = window.location.origin;

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [tablesData, restaurantData] = await Promise.all([
        apiGet("/tables"),
        apiGet("/restaurants/me"),
      ]);

      setTables(Array.isArray(tablesData) ? tablesData : []);
      setRestaurant(restaurantData || null);
    } catch (err) {
      setError(err.message || "Errore caricamento tavoli");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeTables = useMemo(
    () =>
      tables
        .filter((table) => table.isActive)
        .sort((a, b) => String(a.code).localeCompare(String(b.code), "it", { numeric: true })),
    [tables]
  );

  function buildMenuLink(table) {
    if (!restaurant?.slug || !table?.qrToken) return "";
    return `${baseUrl}/menu/${restaurant.slug}/${table.qrToken}`;
  }

  async function createTable(event) {
    event.preventDefault();

    const code = normalizeTableNumber(tableNumber);
    if (!code || saving) return;

    try {
      setSaving(true);
      setError("");
      await apiPost("/tables", {
        name: `Tavolo ${code}`,
        code,
        number: code,
      });
      setTableNumber("");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore creazione tavolo");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(link) {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => {});
  }

  async function regenerateQr(tableId) {
    try {
      await apiPatch(`/tables/${tableId}`, { regenerateQrToken: true });
      await loadData();
    } catch (err) {
      setError(err.message || "Errore rigenerazione QR");
    }
  }

  async function toggleTable(table) {
    try {
      await apiPatch(`/tables/${table.id}`, { isActive: !table.isActive });
      await loadData();
    } catch (err) {
      setError(err.message || "Errore aggiornamento tavolo");
    }
  }

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .qr-print-area, .qr-print-area * { visibility: visible !important; }
          .qr-print-area { position: absolute !important; inset: 0 !important; width: 100% !important; background: white !important; padding: 18px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={appShellStyle}>
        <div className="app-shell" style={{ display: "grid", gap: 14 }}>
          <div className="glass-hero em-compact-hero">
            <div className="topbar-chip">Tavoli & QR</div>
            <h1 style={{ margin: "8px 0 0", fontSize: 28, lineHeight: 1.1 }}>Gestione tavoli semplice</h1>
            <p style={{ margin: "8px 0 0", color: "#475569" }}>
              Ogni tavolo ha solo numero e QR. Niente coperti, zone o campi inutili.
            </p>
          </div>

          {error ? <div style={{ ...card, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>{error}</div> : null}

          <form onSubmit={createTable} style={{ ...card, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "grid", gap: 6, fontWeight: 900 }}>
              Numero tavolo
              <input
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
                placeholder="Es. 1"
                style={inputStyle}
                inputMode="numeric"
              />
            </label>
            <button type="submit" disabled={saving} style={{ ...primaryButton, opacity: saving ? 0.65 : 1 }}>
              {saving ? "Creo..." : "Crea tavolo"}
            </button>
            <button type="button" onClick={() => window.print()} style={lightButton}>
              Stampa QR
            </button>
          </form>

          {loading ? <div style={card}>Caricamento tavoli...</div> : null}

          {!loading && activeTables.length === 0 ? (
            <div style={card}>Nessun tavolo attivo. Crea il primo tavolo per generare il QR.</div>
          ) : null}

          <div className="qr-print-area" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
            {activeTables.map((table) => {
              const link = buildMenuLink(table);

              return (
                <div key={table.id} style={{ ...card, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 950 }}>{table.name || `Tavolo ${table.code}`}</div>
                      <div style={{ color: "#64748b", fontWeight: 800, marginTop: 4 }}>QR menu cliente</div>
                    </div>
                    <button className="no-print" onClick={() => toggleTable(table)} style={lightButton}>
                      Nascondi
                    </button>
                  </div>

                  <div style={{ display: "grid", placeItems: "center", padding: 12, background: "#f8fafc", borderRadius: 16 }}>
                    {link ? <QRCodeCanvas value={link} size={168} includeMargin /> : null}
                  </div>

                  <a href={link} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontWeight: 900, overflowWrap: "anywhere" }}>
                    Apri menu
                  </a>

                  <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => copyLink(link)} style={lightButton}>Copia link</button>
                    <button onClick={() => regenerateQr(table.id)} style={lightButton}>Rigenera QR</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
