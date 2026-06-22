import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Navbar from "../components/Navbar";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";
import "../styles/management-os.css";

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
  const [zoneFilter, setZoneFilter] = useState("all");
  const [tableSearch, setTableSearch] = useState("");
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

  const zones = useMemo(() => ["all", ...new Set(activeTables.map((table) => table.zone || "Sala"))], [activeTables]);

  const visibleTables = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    return activeTables.filter((table) => {
      const zoneMatch = zoneFilter === "all" || (table.zone || "Sala") === zoneFilter;
      const text = [table.name, table.code, table.zone].filter(Boolean).join(" ").toLowerCase();
      return zoneMatch && (!term || text.includes(term));
    });
  }, [activeTables, tableSearch, zoneFilter]);

  const groupedTables = useMemo(() => {
    const map = new Map();
    visibleTables.forEach((table) => {
      const zone = table.zone || "Sala";
      if (!map.has(zone)) map.set(zone, []);
      map.get(zone).push(table);
    });
    return [...map.entries()];
  }, [visibleTables]);

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
        <div className="app-shell management-os">
          <div className="management-hero-main">
            <div className="management-kicker">Sala · high volume</div>
            <h1 className="management-hero-title">Trova qualsiasi tavolo in due secondi.</h1>
            <p className="management-hero-subtitle">
              Ricerca, filtri per zona e griglia compatta: resta veloce anche con centinaia di tavoli tra sala, terrazza e privé.
            </p>
          </div>

          {error ? <div className="management-card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" }}>{error}</div> : null}

          <div className="management-card no-print">
            <div className="management-section-head">
              <div>
                <h2 className="management-title">Controllo sala</h2>
                <p className="management-subtitle">{visibleTables.length} tavoli visibili su {activeTables.length} attivi.</p>
              </div>
              <div className="management-row">
                <input className="management-input" value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Cerca tavolo, codice o zona" style={{ minWidth: 260 }} />
                <select className="management-select" value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)} style={{ minWidth: 180 }}>
                  {zones.map((zone) => <option key={zone} value={zone}>{zone === "all" ? "Tutte le zone" : zone}</option>)}
                </select>
                <button type="button" onClick={() => window.print()} className="management-btn secondary">Stampa QR</button>
              </div>
            </div>

            <form onSubmit={createTable} className="management-row">
              <input
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
                placeholder="Nuovo tavolo es. 101"
                className="management-input"
                inputMode="numeric"
                style={{ maxWidth: 220 }}
              />
              <button type="submit" disabled={saving} className="management-btn">
                {saving ? "Creo..." : "Crea tavolo"}
              </button>
            </form>
          </div>

          {loading ? <div className="management-card">Caricamento tavoli...</div> : null}
          {!loading && activeTables.length === 0 ? <div className="management-card">Nessun tavolo attivo. Crea il primo tavolo per generare il QR.</div> : null}

          <div className="qr-print-area management-card" style={{ display: "grid", gap: 18 }}>
            {groupedTables.map(([zone, zoneTables]) => (
              <div key={zone} style={{ display: "grid", gap: 12 }}>
                <div className="management-row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <h2 className="management-title" style={{ fontSize: 22 }}>{zone}</h2>
                    <p className="management-subtitle">{zoneTables.length} tavoli</p>
                  </div>
                  <span className="management-badge gray">QR cliente</span>
                </div>

                <div className="table-planner-grid">
                  {zoneTables.map((table) => {
                    const link = buildMenuLink(table);
                    return (
                      <div key={table.id} className="table-planner-seat" style={{ minHeight: 190 }}>
                        <div>
                          <strong>{table.code || table.name}</strong>
                          <span>{table.name || `Tavolo ${table.code}`}</span>
                        </div>

                        <div style={{ display: "grid", placeItems: "center", padding: 8, background: "#f8fafc", borderRadius: 14 }}>
                          {link ? <QRCodeCanvas value={link} size={88} includeMargin /> : null}
                        </div>

                        <div className="no-print management-row" style={{ gap: 6 }}>
                          <button type="button" onClick={() => copyLink(link)} className="management-btn secondary" style={{ padding: "7px 9px", minHeight: 0, fontSize: 12 }}>Copia</button>
                          <button type="button" onClick={() => regenerateQr(table.id)} className="management-btn secondary" style={{ padding: "7px 9px", minHeight: 0, fontSize: 12 }}>QR</button>
                          <button type="button" onClick={() => toggleTable(table)} className="management-btn secondary" style={{ padding: "7px 9px", minHeight: 0, fontSize: 12 }}>Off</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {!loading && visibleTables.length === 0 && activeTables.length > 0 ? <div className="management-subtitle">Nessun tavolo trovato con questi filtri.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}