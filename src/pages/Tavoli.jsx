import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Navbar from "../components/Navbar";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { glowPageStyle } from "../styles/pageStyles";

const card = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
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

function makeLocalTables(total = 12) {
  return Array.from({ length: total }, (_, index) => {
    const code = String(index + 1);
    return {
      id: `local-${code}`,
      name: `Tavolo ${code}`,
      code,
      qrToken: `local-${code}`,
      isActive: true,
      isLocal: true,
    };
  });
}

function reservationsKey(restaurant) {
  return `easymenu_reservations_${restaurant?.id || restaurant?.slug || "local"}`;
}

function todayKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const activeReservationStatuses = new Set(["booked", "seated"]);

const reservationStatusLabels = {
  booked: "Prenotata",
  seated: "Arrivata",
  cancelled: "Cancellata",
  no_show: "No show",
};

function normalizeReservation(item = {}) {
  return {
    id: item.id || `reservation-${Date.now()}`,
    tableId: item.tableId || item.table?.id || "",
    tableCode: item.tableCode || item.table?.code || "",
    tableName: item.tableName || item.table?.name || "",
    name: item.name || item.customerName || "",
    customerName: item.customerName || item.name || "",
    date: String(item.date || todayKey()).slice(0, 10),
    time: item.time || "",
    guests: item.guests ? String(item.guests) : "",
    phone: item.phone || "",
    notes: item.notes || "",
    status: item.status || "booked",
  };
}

function normalizeReservationsResponse(data) {
  const items = Array.isArray(data) ? data : Array.isArray(data?.reservations) ? data.reservations : [];
  return items.map(normalizeReservation);
}

function getActiveReservation(table, reservations) {
  const today = todayKey();
  return (
    reservations.find((reservation) => {
      const isActive = activeReservationStatuses.has(reservation.status || "booked");
      const isToday = !reservation.date || reservation.date === today;
      return isActive && isToday && (reservation.tableId === table.id || reservation.tableCode === table.code);
    }) || null
  );
}

function getVisualTableState(table, state, reservation) {
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
  if (reservation) {
    return { kind: "reserved", label: "Prenotato", detail: `${reservation.time || "--:--"} - ${reservation.name || "Cliente"}`, total: 0 };
  }
  return { kind: "free", label: "Libero", detail: "Nessun ordine", total: 0 };
}

export default function Tavoli() {
  const [tables, setTables] = useState([]);
  const [tableStatuses, setTableStatuses] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [localMode, setLocalMode] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [reservationForm, setReservationForm] = useState({
    name: "",
    date: todayKey(),
    time: "",
    guests: "",
    phone: "",
    notes: "",
    status: "booked",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [editingReservationId, setEditingReservationId] = useState(null);
  const baseUrl = window.location.origin;

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [tablesResult, restaurantResult, statusResult, reservationsResult] = await Promise.allSettled([
        apiGet("/tables"),
        apiGet("/restaurants/me"),
        apiGet("/tables/status"),
        apiGet("/reservations"),
      ]);

      const restaurantData = restaurantResult.status === "fulfilled" ? restaurantResult.value : null;
      const tablesData = tablesResult.status === "fulfilled" ? tablesResult.value : null;
      const statusesData = statusResult.status === "fulfilled" ? statusResult.value : null;
      const storedReservations = JSON.parse(localStorage.getItem(reservationsKey(restaurantData)) || "[]");
      const reservationData = reservationsResult.status === "fulfilled"
        ? normalizeReservationsResponse(reservationsResult.value)
        : normalizeReservationsResponse(storedReservations);

      if (tablesResult.status === "rejected") {
        const savedLocalTables = JSON.parse(localStorage.getItem("easymenu_local_tables") || "[]");
        const fallbackTables = savedLocalTables.length ? savedLocalTables : makeLocalTables(12);
        localStorage.setItem("easymenu_local_tables", JSON.stringify(fallbackTables));
        setTables(fallbackTables);
        setLocalMode(true);
        setError(tablesResult.reason?.message || "Account scaduto o tavoli non raggiungibili: mostro una mappa locale provvisoria.");
      } else {
        setTables(Array.isArray(tablesData) ? tablesData : []);
        setLocalMode(false);
      }

      setTableStatuses(normalizeStatusResponse(statusesData));
      setReservations(reservationData);
      setRestaurant(restaurantData || null);

      if (reservationsResult.status === "rejected" && tablesResult.status === "fulfilled") {
        setError(reservationsResult.reason?.message || "Prenotazioni non raggiungibili: uso solo i dati locali di emergenza.");
      }
    } catch (err) {
      const fallbackTables = makeLocalTables(12);
      setTables(fallbackTables);
      setLocalMode(true);
      setError(err.message || "Errore caricamento tavoli: mostro una mappa locale provvisoria.");
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
          const reservation = getActiveReservation(table, reservations);
          return {
            ...table,
            liveState: state,
            reservation,
            visualState: getVisualTableState(table, state, reservation),
          };
        })
        .sort((a, b) => String(a.code).localeCompare(String(b.code), "it", { numeric: true })),
    [tables, tableStatusMap, reservations]
  );

  const selectedTable = useMemo(
    () => activeTables.find((table) => table.id === selectedTableId) || activeTables[0] || null,
    [activeTables, selectedTableId]
  );

  const editingReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === editingReservationId) || selectedTable?.reservation || null,
    [reservations, editingReservationId, selectedTable]
  );

  const upcomingReservations = useMemo(
    () =>
      [...reservations]
        .filter((reservation) => activeReservationStatuses.has(reservation.status || "booked"))
        .sort((a, b) => `${a.date || "9999-99-99"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-99-99"} ${b.time || "99:99"}`))
        .slice(0, 4),
    [reservations]
  );

  const gridCols = useMemo(() => {
    const total = Math.max(activeTables.length, 1);
    if (total <= 8) return 4;
    if (total <= 20) return 5;
    if (total <= 36) return 6;
    if (total <= 64) return 8;
    if (total <= 100) return 12;
    if (total <= 144) return 14;
    return 16;
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
      if (localMode) {
        const nextTable = {
          id: `local-${code}`,
          name: `Tavolo ${code}`,
          code,
          qrToken: `local-${code}`,
          isActive: true,
          isLocal: true,
        };
        const nextTables = [...tables.filter((table) => table.code !== code), nextTable]
          .sort((a, b) => String(a.code).localeCompare(String(b.code), "it", { numeric: true }));
        setTables(nextTables);
        localStorage.setItem("easymenu_local_tables", JSON.stringify(nextTables));
        setTableNumber("");
        return;
      }
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
      if (localMode || String(tableId).startsWith("local-")) {
        const nextTables = tables.map((table) =>
          table.id === tableId ? { ...table, qrToken: `${table.id}-${Date.now()}` } : table
        );
        setTables(nextTables);
        localStorage.setItem("easymenu_local_tables", JSON.stringify(nextTables));
        return;
      }
      await apiPatch(`/tables/${tableId}`, { regenerateQrToken: true });
      await loadData();
    } catch (err) {
      setError(err.message || "Errore rigenerazione QR");
    }
  }

  async function toggleTable(table) {
    try {
      if (localMode || table.isLocal) {
        const nextTables = tables.map((item) =>
          item.id === table.id ? { ...item, isActive: !item.isActive } : item
        );
        setTables(nextTables);
        localStorage.setItem("easymenu_local_tables", JSON.stringify(nextTables));
        return;
      }
      await apiPatch(`/tables/${table.id}`, { isActive: !table.isActive });
      await loadData();
    } catch (err) {
      setError(err.message || "Errore aggiornamento tavolo");
    }
  }

  async function saveReservation(event) {
    event.preventDefault();
    if (!selectedTable || !reservationForm.name.trim() || saving) return;

    const reservationPayload = {
      tableId: selectedTable.id,
      tableCode: selectedTable.code,
      customerName: reservationForm.name.trim(),
      name: reservationForm.name.trim(),
      date: reservationForm.date || todayKey(),
      time: reservationForm.time || "",
      guests: reservationForm.guests || 2,
      phone: reservationForm.phone.trim(),
      notes: reservationForm.notes.trim(),
      status: reservationForm.status || "booked",
    };

    try {
      setSaving(true);
      setError("");

      if (localMode || selectedTable.isLocal) {
        const reservation = normalizeReservation({
          id: editingReservation?.id || `reservation-${Date.now()}`,
          ...reservationPayload,
        });
        const nextReservations = [
          ...reservations.filter((item) => item.id !== reservation.id),
          reservation,
        ];
        setReservations(nextReservations);
        localStorage.setItem(reservationsKey(restaurant), JSON.stringify(nextReservations));
      } else if (editingReservation?.id) {
        await apiPatch(`/reservations/${editingReservation.id}`, reservationPayload);
        await loadData();
      } else {
        await apiPost("/reservations", reservationPayload);
        await loadData();
      }

      setReservationForm({ name: "", date: todayKey(), time: "", guests: "", phone: "", notes: "", status: "booked" });
      setEditingReservationId(null);
    } catch (err) {
      setError(err.message || "Errore salvataggio prenotazione");
    } finally {
      setSaving(false);
    }
  }

  async function clearReservation(table, reservation = table?.reservation) {
    if (!reservation) return;
    try {
      setSaving(true);
      setError("");
      if (localMode || table.isLocal) {
        const nextReservations = reservations.filter((item) => item.id !== reservation.id);
        setReservations(nextReservations);
        localStorage.setItem(reservationsKey(restaurant), JSON.stringify(nextReservations));
      } else {
        await apiDelete(`/reservations/${reservation.id}`);
        await loadData();
      }
      setEditingReservationId(null);
      setReservationForm({ name: "", date: todayKey(), time: "", guests: "", phone: "", notes: "", status: "booked" });
    } catch (err) {
      setError(err.message || "Errore cancellazione prenotazione");
    } finally {
      setSaving(false);
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

      <div className="operator-workspace tables-workspace">
        <section className="tables-controlbar">
          <div>
            <span>Sala</span>
            <strong>{activeTables.length} tavoli</strong>
          </div>
          <div className="tables-controlbar__legend">
            <i className="free" /> libero <i className="occupied" /> occupato <i className="bill" /> conto <i className="reserved" /> prenotato
          </div>
          <form onSubmit={createTable} className="tables-controlbar__form">
            <input
              value={tableNumber}
              onChange={(event) => setTableNumber(event.target.value)}
              placeholder="N. tavolo"
              inputMode="numeric"
            />
            <button type="submit" disabled={saving}>{saving ? "Creo..." : "+ Tavolo"}</button>
            <button type="button" onClick={() => window.print()}>Stampa QR</button>
          </form>
        </section>

        {error ? (
          <div className="tables-alert">
            <b>Attenzione</b>
            <span>{error}</span>
            {localMode ? <small>Modalita locale provvisoria: le prenotazioni rimangono su questo dispositivo.</small> : null}
          </div>
        ) : null}

        <section className="tables-main-layout">
          <div className="tables-map-panel">
            <div className="tables-map-head">
              <div>
                <strong>Mappa tavoli</strong>
                <span>Tutti i tavoli in un colpo d'occhio. Se sono 100, le card diventano compatte.</span>
              </div>
              <button type="button" onClick={loadData}>Aggiorna</button>
            </div>

            {loading ? <div style={card}>Caricamento tavoli...</div> : null}

            {!loading && activeTables.length === 0 ? (
              <div className="tables-empty-map">
                <strong>Nessun tavolo attivo</strong>
                <span>Crea il primo tavolo oppure prepara subito una sala demo da 12 tavoli.</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextTables = makeLocalTables(12);
                    setTables(nextTables);
                    setLocalMode(true);
                    localStorage.setItem("easymenu_local_tables", JSON.stringify(nextTables));
                  }}
                >
                  Crea sala 12 tavoli
                </button>
              </div>
            ) : null}

            {!loading && activeTables.length > 0 ? (
              <div
                className="qr-print-area em-table-grid em-table-grid--tables"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                  gap: activeTables.length > 80 ? 6 : 10,
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
                      onClick={() => {
                        setSelectedTableId(table.id);
                        setEditingReservationId(table.reservation?.id || null);
                        setReservationForm({
                          name: table.reservation?.name || "",
                          date: table.reservation?.date || todayKey(),
                          time: table.reservation?.time || "",
                          guests: table.reservation?.guests || "",
                          phone: table.reservation?.phone || "",
                          notes: table.reservation?.notes || "",
                          status: table.reservation?.status || "booked",
                        });
                      }}
                      className={`table-map-tile table-map-tile--${visual.kind} ${isSelected ? "is-selected" : ""}`}
                    >
                      <span className="table-map-tile__number">{tableCode}</span>
                      <span className="table-map-tile__label">{visual.label}</span>
                      <span className="table-map-tile__detail">{visual.detail}</span>
                      {visual.total ? <span className="table-map-tile__total">{formatEuro(visual.total)}</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <aside className="tables-side-panel">
            {selectedTable ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div className="tables-side-panel__head">
                  <div>
                    <span>Tavolo selezionato</span>
                    <strong>{selectedTable.name || `Tavolo ${selectedTable.code}`}</strong>
                  </div>
                  <button type="button" onClick={() => {
                    setSelectedTableId(null);
                    setEditingReservationId(null);
                  }}>x</button>
                </div>

                <div className={`table-side-status table-side-status--${selectedTable.visualState?.kind || "free"}`}>
                  <span>{selectedTable.visualState?.label || "Libero"}</span>
                  <b>{selectedTable.visualState?.total ? formatEuro(selectedTable.visualState.total) : "Nessun conto"}</b>
                  <small>{selectedTable.visualState?.detail || "Nessun ordine"}</small>
                </div>

                <section className="tables-reservation-strip tables-reservation-strip--compact">
                  <div>
                    <span>Prenotazioni</span>
                    <strong>{reservations.length}</strong>
                    <small>{upcomingReservations.length ? "Prossime assegnate" : "Nessuna prenotazione"}</small>
                  </div>
                  <div className="tables-reservation-strip__list">
                    {upcomingReservations.length ? (
                      upcomingReservations.map((reservation) => (
                        <button
                          key={reservation.id}
                          type="button"
                          onClick={() => {
                            setSelectedTableId(reservation.tableId);
                            setEditingReservationId(reservation.id);
                            setReservationForm({
                              name: reservation.name || "",
                              date: reservation.date || todayKey(),
                              time: reservation.time || "",
                              guests: reservation.guests || "",
                              phone: reservation.phone || "",
                              notes: reservation.notes || "",
                              status: reservation.status || "booked",
                            });
                          }}
                        >
                          <b>T{reservation.tableCode}</b>
                          <span>{reservation.date || "Oggi"} {reservation.time || "--:--"} - {reservation.name || "Cliente"}</span>
                          <small>{reservationStatusLabels[reservation.status] || "Prenotata"}</small>
                        </button>
                      ))
                    ) : (
                      <span className="tables-reservation-strip__empty">Nessuna prenotazione rapida.</span>
                    )}
                  </div>
                </section>

                <form className="table-reservation-card" onSubmit={saveReservation}>
                  <div>
                    <strong>Prenota tavolo</strong>
                    <span>{editingReservation ? "Modifica prenotazione" : "Salva nome, data, orario e coperti"}</span>
                  </div>
                  <input value={reservationForm.name} onChange={(event) => setReservationForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nome cliente" />
                  <div className="table-reservation-card__grid">
                    <input type="date" value={reservationForm.date} onChange={(event) => setReservationForm((prev) => ({ ...prev, date: event.target.value }))} />
                    <input type="time" value={reservationForm.time} onChange={(event) => setReservationForm((prev) => ({ ...prev, time: event.target.value }))} placeholder="Ora" />
                    <input value={reservationForm.guests} onChange={(event) => setReservationForm((prev) => ({ ...prev, guests: event.target.value }))} placeholder="Coperti" inputMode="numeric" />
                    <select value={reservationForm.status} onChange={(event) => setReservationForm((prev) => ({ ...prev, status: event.target.value }))}>
                      <option value="booked">Prenotata</option>
                      <option value="seated">Arrivata</option>
                      <option value="no_show">No show</option>
                    </select>
                  </div>
                  <input value={reservationForm.phone} onChange={(event) => setReservationForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Telefono" />
                  <textarea value={reservationForm.notes} onChange={(event) => setReservationForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Note" rows={2} />
                  <div className="table-reservation-card__actions">
                    <button type="submit">{saving ? "Salvo..." : "Salva"}</button>
                    {editingReservation ? <button type="button" onClick={() => clearReservation(selectedTable, editingReservation)}>Libera</button> : null}
                  </div>
                </form>

                <div className="qr-panel no-print">
                  <div className="qr-panel__code">
                    {buildMenuLink(selectedTable) ? <QRCodeCanvas value={buildMenuLink(selectedTable)} size={150} includeMargin /> : null}
                  </div>
                  <a href={buildMenuLink(selectedTable)} target="_blank" rel="noreferrer">Apri menu cliente</a>
                  <button onClick={() => copyLink(buildMenuLink(selectedTable))} style={primaryButton}>Copia link QR</button>
                  <button onClick={() => regenerateQr(selectedTable.id)} style={lightButton}>Rigenera QR</button>
                  <button onClick={() => toggleTable(selectedTable)} style={lightButton}>Nascondi tavolo</button>
                </div>
              </div>
            ) : (
              <div className="tables-side-empty">Seleziona un tavolo per prenotare, copiare QR o modificarne lo stato.</div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
