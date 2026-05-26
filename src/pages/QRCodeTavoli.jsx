import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Navbar from "../components/Navbar";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { appShellStyle, glowPageStyle } from "../styles/pageStyles";

export default function QRCodeTavoli() {
  const [tables, setTables] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editing, setEditing] = useState({});

  const [newTablesCount, setNewTablesCount] = useState(1);
  const [newTablesSeats, setNewTablesSeats] = useState(4);
  const [newTablesZone, setNewTablesZone] = useState("");

  const base = window.location.origin;

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [tablesData, restaurantData] = await Promise.all([
        apiGet("/tables"),
        apiGet("/restaurants/me"),
      ]);

      const normalizedTables = Array.isArray(tablesData) ? tablesData : [];

      setTables(normalizedTables);
      setRestaurant(restaurantData);

      const editState = {};
      normalizedTables.forEach((table) => {
        editState[table.id] = {
          name: table.name || "",
          code: table.code || "",
          seats: table.seats || 1,
          zone: table.zone || "",
          isActive: table.isActive !== false,
        };
      });
      setEditing(editState);
    } catch (err) {
      setError(err.message || "Errore caricamento QR tavoli");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeTables = useMemo(
    () => tables.filter((table) => table.isActive !== false),
    [tables]
  );

  const inactiveTables = useMemo(
    () => tables.filter((table) => table.isActive === false),
    [tables]
  );

  function buildLink(table) {
    return `${base}/menu/${restaurant?.slug}/${table.qrToken}`;
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link).catch(() => {});
    setSuccess("Link copiato negli appunti.");
    setTimeout(() => setSuccess(""), 2500);
  }

  function getNextTableNumber() {
    const numericCodes = tables
      .map((table) =>
        Number(String(table.code || table.name || "").replace(/[^0-9]/g, ""))
      )
      .filter((value) => Number.isFinite(value) && value > 0);

    return numericCodes.length ? Math.max(...numericCodes) + 1 : tables.length + 1;
  }

  function updateEditing(tableId, field, value) {
    setEditing((current) => ({
      ...current,
      [tableId]: {
        ...(current[tableId] || {}),
        [field]: value,
      },
    }));
  }

  async function createMoreTables(event) {
    event.preventDefault();

    const count = Math.max(1, Math.min(100, Number(newTablesCount || 1)));
    const seats = Math.max(1, Math.min(50, Number(newTablesSeats || 4)));
    const zone = String(newTablesZone || "").trim();
    const firstNumber = getNextTableNumber();

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      for (let index = 0; index < count; index += 1) {
        const number = firstNumber + index;

        await apiPost("/tables", {
          name: `Tavolo ${number}`,
          code: String(number),
          number: String(number),
          seats,
          zone: zone || null,
          sortOrder: number,
          isActive: true,
        });
      }

      setNewTablesCount(1);
      setSuccess(`${count} tavol${count === 1 ? "o aggiunto" : "i aggiunti"} correttamente.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Errore durante aggiunta tavoli");
    } finally {
      setCreating(false);
    }
  }

  async function saveTable(tableId) {
    const data = editing[tableId];

    if (!data?.name?.trim()) {
      setError("Il nome del tavolo è obbligatorio.");
      return;
    }

    try {
      setSavingId(tableId);
      setError("");
      setSuccess("");

      await apiPatch(`/tables/${tableId}`, {
        name: data.name.trim(),
        code: String(data.code || "").trim() || null,
        seats: Math.max(1, Math.min(50, Number(data.seats || 1))),
        zone: String(data.zone || "").trim() || null,
        isActive: Boolean(data.isActive),
      });

      setSuccess("Tavolo aggiornato correttamente.");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore aggiornamento tavolo");
    } finally {
      setSavingId(null);
    }
  }

  async function regenerateQr(tableId) {
    try {
      setSavingId(tableId);
      setError("");
      setSuccess("");

      await apiPatch(`/tables/${tableId}`, { regenerateQrToken: true });

      setSuccess("QR rigenerato correttamente.");
      await loadData();
    } catch (err) {
      setError(err.message || "Errore rigenerazione QR");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleTable(table) {
    const current = editing[table.id] || table;

    try {
      setSavingId(table.id);
      setError("");
      setSuccess("");

      await apiPatch(`/tables/${table.id}`, {
        isActive: !(current.isActive !== false),
      });

      setSuccess(
        current.isActive !== false
          ? "Tavolo disattivato correttamente."
          : "Tavolo riattivato correttamente."
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Errore aggiornamento stato tavolo");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteTable(table) {
    const confirmDelete = window.confirm(
      `Vuoi eliminare definitivamente ${table.name}? Questa azione non si può annullare.`
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(table.id);
      setError("");
      setSuccess("");

      await apiDelete(`/tables/${table.id}`);

      setSuccess("Tavolo eliminato correttamente.");
      await loadData();
    } catch (err) {
      setError(
        err.message ||
          "Errore eliminazione tavolo. Se ha ordini collegati, disattivalo invece di eliminarlo."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function renderTableCard(table) {
    const edit = editing[table.id] || {};
    const link = buildLink(table);
    const isDisabled = savingId === table.id || deletingId === table.id;
    const isActive = table.isActive !== false;

    return (
      <div
        key={table.id}
        className="section-card"
        style={{
          background: "rgba(255,255,255,0.96)",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#123b6b" }}>
              {table.name}
            </div>
            <div style={{ color: "#64748b", marginTop: 4 }}>
              Codice {table.code || "-"} · {table.seats || "-"} coperti
              {table.zone ? ` · ${table.zone}` : ""}
            </div>
          </div>

          <span
            style={{
              alignSelf: "start",
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 900,
              background: isActive ? "#dcfce7" : "#fee2e2",
              color: isActive ? "#166534" : "#991b1b",
            }}
          >
            {isActive ? "Attivo" : "Disattivato"}
          </span>
        </div>

        {isActive ? (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <QRCodeCanvas value={link} size={180} includeMargin />
            </div>

            <div
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: "#475569",
                wordBreak: "break-all",
                textAlign: "center",
              }}
            >
              {link}
            </div>
          </>
        ) : (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: "#f8fafc",
              color: "#64748b",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            Tavolo disattivato: il QR non dovrebbe essere usato dai clienti.
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10,
            marginTop: 4,
          }}
        >
          <label style={{ display: "grid", gap: 5, color: "#123b6b", fontWeight: 800 }}>
            Nome
            <input
              value={edit.name || ""}
              onChange={(event) => updateEditing(table.id, "name", event.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 800,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 5, color: "#123b6b", fontWeight: 800 }}>
            Codice
            <input
              value={edit.code || ""}
              onChange={(event) => updateEditing(table.id, "code", event.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 800,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 5, color: "#123b6b", fontWeight: 800 }}>
            Coperti
            <input
              type="number"
              min="1"
              max="50"
              value={edit.seats || 1}
              onChange={(event) => updateEditing(table.id, "seats", event.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 800,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 5, color: "#123b6b", fontWeight: 800 }}>
            Zona
            <input
              value={edit.zone || ""}
              placeholder="Sala, Terrazza..."
              onChange={(event) => updateEditing(table.id, "zone", event.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 800,
              }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => saveTable(table.id)} disabled={isDisabled}>
            {savingId === table.id ? "Salvo..." : "Salva"}
          </button>

          {isActive ? (
            <button type="button" onClick={() => copyLink(link)} disabled={isDisabled}>
              Copia link
            </button>
          ) : null}

          <button type="button" onClick={() => regenerateQr(table.id)} disabled={isDisabled}>
            Rigenera QR
          </button>

          <button type="button" onClick={() => toggleTable(table)} disabled={isDisabled}>
            {isActive ? "Disattiva" : "Riattiva"}
          </button>

          <button
            type="button"
            onClick={() => deleteTable(table)}
            disabled={isDisabled}
            style={{ background: "#dc2626" }}
          >
            {deletingId === table.id ? "Elimino..." : "Elimina"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={glowPageStyle}>
      <Navbar />

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .qr-print-area, .qr-print-area * { visibility: visible !important; }
          .qr-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 24px !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={appShellStyle}>
        <div className="app-shell" style={{ display: "grid", gap: 18 }}>
          <div className="glass-hero" style={{ padding: 24 }}>
            <div className="topbar-chip" style={{ marginBottom: 12 }}>QR tavoli</div>

            <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>
              Gestione tavoli e QR del ristorante
            </h1>

            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                color: "rgba(255,255,255,0.9)",
                maxWidth: 760,
                lineHeight: 1.7,
              }}
            >
              Aggiungi tavoli, modifica nome/coperti/zona, rigenera QR, copia i link pubblici
              e stampa tutti i QR collegati al database reale.
            </p>
          </div>

          {error ? (
            <div className="section-card no-print" style={{ color: "#b91c1c", fontWeight: 800 }}>
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="section-card no-print" style={{ color: "#166534", fontWeight: 800 }}>
              {success}
            </div>
          ) : null}

          <div
            className="os-grid no-print"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
          >
            <div className="metric-card">
              <div className="metric-label">Ristorante</div>
              <div className="metric-value" style={{ fontSize: 28 }}>
                {restaurant?.name || "-"}
              </div>
              <div className="metric-badge">slug {restaurant?.slug || "-"}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Tavoli attivi</div>
              <div className="metric-value">{activeTables.length}</div>
              <div className="metric-badge">QR pronti</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Tavoli disattivati</div>
              <div className="metric-value">{inactiveTables.length}</div>
              <div className="metric-badge">non visibili ai clienti</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Routing</div>
              <div className="metric-value" style={{ fontSize: 28 }}>
                Live
              </div>
              <div className="metric-badge">/menu/:slug/:tableToken</div>
            </div>
          </div>

          <div className="section-card no-print" style={{ display: "grid", gap: 16 }}>
            <div>
              <div className="panel-title">Aumenta numero tavoli</div>
              <div className="panel-subtitle">
                Aggiungi nuovi tavoli reali nel database: ogni tavolo riceve
                automaticamente QR dedicato e link pubblico.
              </div>
            </div>

            <form
              onSubmit={createMoreTables}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                alignItems: "end",
              }}
            >
              <label style={{ display: "grid", gap: 6, color: "#123b6b", fontWeight: 800 }}>
                Quanti tavoli aggiungere
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTablesCount}
                  onChange={(event) => setNewTablesCount(event.target.value)}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontWeight: 800,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6, color: "#123b6b", fontWeight: 800 }}>
                Coperti per tavolo
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newTablesSeats}
                  onChange={(event) => setNewTablesSeats(event.target.value)}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontWeight: 800,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 6, color: "#123b6b", fontWeight: 800 }}>
                Zona / sala opzionale
                <input
                  type="text"
                  placeholder="Sala interna, Terrazza..."
                  value={newTablesZone}
                  onChange={(event) => setNewTablesZone(event.target.value)}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontWeight: 800,
                  }}
                />
              </label>

              <button type="submit" disabled={creating} style={{ minHeight: 46 }}>
                {creating ? "Aggiungo..." : "Aggiungi tavoli"}
              </button>
            </form>

            <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
              Prossimo tavolo suggerito: <b>Tavolo {getNextTableNumber()}</b>. I nuovi
              tavoli compariranno subito anche in Cassa, Tavoli e stampa QR.
            </div>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => window.print()}>
              Stampa QR attivi
            </button>

            <button type="button" onClick={loadData}>
              Ricarica
            </button>
          </div>

          {loading ? (
            <div className="section-card">Caricamento QR...</div>
          ) : (
            <>
              <div
                className="qr-print-area"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {activeTables.map(renderTableCard)}

                {activeTables.length === 0 ? (
                  <div className="section-card">Nessun tavolo attivo disponibile.</div>
                ) : null}
              </div>

              {inactiveTables.length > 0 ? (
                <div className="no-print" style={{ display: "grid", gap: 12 }}>
                  <div className="panel-title" style={{ color: "#fff" }}>
                    Tavoli disattivati
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {inactiveTables.map(renderTableCard)}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}