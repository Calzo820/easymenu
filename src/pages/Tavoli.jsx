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

function normalizeStatusResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tables)) return data.tables;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function formatEuro(value) {
  return `EUR ${Number(value || 0).toFixed(2)}`;
}

function getVisualTableState(table, state) {
  const status = state?.status || (table.isActive ? "free" : "inactive");
  const order = state?.activeOrder || null;
  const session = state?.activeSession || null;

  if (!table.isActive) {
    return { kind: "inactive", label: "Nascosto", detail: "Non visibile", total: 0 };
  }
  if (status === "bill_requested" || order?.paymentStatus === "pending" || session?.status === "closing") {
    return { kind: "bill", label: "Conto", detail: "Richiesto", total: order?.totalAmount || session?.totalAmount || 0 };
  }
  if (status === "ready") {
    return { kind: "ready", label: "Pronto", detail: "Da servire", total: order?.totalAmount || session?.totalAmount || 0 };
  }
  if (status === "in_progress" || status === "pending" || status === "active") {
    return { kind: "occupied", label: "Occupato", detail: order ? `Ordine ${order.orderNumber || ""}` : "Sessione aperta", total: order?.totalAmount || session?.totalAmount || 0 };
  }
  return { kind: "free", label: "Libero", detail: "Nessun ordine", total: 0 };
}

export default function Tavoli() {
  const [tables, setTables] = useState([]);
  const [tableStatuses, setTableStatuses] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [tableNumber, setTableNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedTableId, setSelectedTableId] = useState(null);
  const baseUrl = window.location.origin;

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [tablesData, restaurantData, statusResult] = await Promise.all([
        apiGet("/tables"),
        apiGet("/restaurants/me"),
        apiGet("/tables/status").catch(() => null),
      ]);

      setTables(Array.isArray(tablesData) ? tablesData : []);
      setTableStatuses(normalizeStatusResponse(statusResult));
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

  const tableStatusMap = useMemo(() => {
    const map = new Map();
    tableStatuses.forEach((state) => {
      if (state.id) map.set(`id:${state.id}`, state);
      if (state.code) map.set(`code:${state.code}`, state);
      if (state.number) map.set(`code:${state.number}`, state);
    });
    return map;
  }, [tableStatuses]);

  const activeTables = useMemo(
    () =>
      tables
        .filter((table) => table.isActive)
        .map((table) => {
          const state = tableStatusMap.get(`id:${table.id}`) || tableStatusMap.get(`code:${table.code}`) || null;
          return {
            ...table,
            liveState: state,
            visualState: getVisualTableState(table, state),
          };
        })
        .sort((a, b) => String(a.code).localeCompare(String(b.code), "it", { numeric: true })),
    [tables, tableStatusMap]
  );

  const selectedTable = useMemo(
    () => activeTables.find((table) => table.id === selectedTableId) || activeTables[0] || null,
    [activeTables, selectedTableId]
  );

  const gridCols = useMemo(() => {
    const total = Math.max(activeTables.length, 1);
    if (total <= 8) return 4;
    if (total <= 20) return 5;
    if (total <= 36) return 6;
    if (total <= 64) return 8;
    if (total <= 100) return 10;
    return 12;
  }, [activeTables.length]);

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

          {!loading && activeTables.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 14, alignItems: "start" }}>
              <div style={{ ...card, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 950, fontSize: 20 }}>Mappa tavoli</div>
                    <div style={{ color: "#64748b", fontWeight: 750, marginTop: 4 }}>
                      Tutti i tavoli visibili. Clicca un tavolo per QR, link o prenotazione.
                    </div>
                  </div>
                  <div style={{ fontWeight: 950, color: "#0f172a" }}>{activeTables.length} tavoli</div>
                </div>

                <div
                  className="qr-print-area"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridCols}, minmax(88px, 1fr))`,
                    gap: activeTables.length > 80 ? 8 : 12,
                    height: "calc(100vh - 250px)",
                    minHeight: 420,
                  }}
                >
                  {activeTables.map((table) => {
                    const isSelected = selectedTable?.id === table.id;
                    const visual = table.visualState || getVisualTableState(table, table.liveState);
                    const tableCode = table.code || table.number || table.name?.replace(/[^0-9A-Za-z-]/g, "") || table.id;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => setSelectedTableId(table.id)}
                        className={`table-map-tile table-map-tile--${visual.kind} ${isSelected ? "is-selected" : ""}`}
                      >
                        <span className="table-map-tile__number">T{tableCode}</span>
                        <span className="table-map-tile__label">{visual.label}</span>
                        <span className="table-map-tile__detail">{visual.detail}</span>
                        {visual.total ? <span className="table-map-tile__total">{formatEuro(visual.total)}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside style={{ ...card, position: "sticky", top: 18 }}>
                {selectedTable ? (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 950 }}>{selectedTable.name || `Tavolo ${selectedTable.code}`}</div>
                      <div style={{ color: "#64748b", fontWeight: 800, marginTop: 4 }}>QR e azioni rapide</div>
                    </div>

                    <div className={`table-side-status table-side-status--${selectedTable.visualState?.kind || "free"}`}>
                      <span>{selectedTable.visualState?.label || "Libero"}</span>
                      <b>{selectedTable.visualState?.total ? formatEuro(selectedTable.visualState.total) : "Nessun conto aperto"}</b>
                      <small>{selectedTable.visualState?.detail || "Nessun ordine"}</small>
                    </div>

                    <div style={{ display: "grid", placeItems: "center", padding: 16, background: "#f8fafc", borderRadius: 18 }}>
                      {buildMenuLink(selectedTable) ? <QRCodeCanvas value={buildMenuLink(selectedTable)} size={210} includeMargin /> : null}
                    </div>

                    <a href={buildMenuLink(selectedTable)} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontWeight: 900, overflowWrap: "anywhere" }}>
                      Apri menu cliente
                    </a>

                    <div className="no-print" style={{ display: "grid", gap: 8 }}>
                      <button onClick={() => copyLink(buildMenuLink(selectedTable))} style={primaryButton}>Copia link QR</button>
                      <button onClick={() => regenerateQr(selectedTable.id)} style={lightButton}>Rigenera QR</button>
                      <button onClick={() => toggleTable(selectedTable)} style={lightButton}>Nascondi tavolo</button>
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          ) : null}        </div>
      </div>
    </div>
  );
}
