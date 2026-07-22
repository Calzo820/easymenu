import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Navbar from "../components/Navbar";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api";
import { glowPageStyle } from "../styles/pageStyles";

const ACTIVE_RESERVATION_STATUSES = new Set(["booked", "seated"]);
const STATUS_LABELS = {
  booked: "Prenotata",
  seated: "Arrivata",
  cancelled: "Cancellata",
  no_show: "Non presentato",
};

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function parseDateKey(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00`);
}

function monthKey(value) {
  const date = parseDateKey(value || localDateKey());
  date.setDate(1);
  return localDateKey(date);
}

function addMonths(value, amount) {
  const date = parseDateKey(monthKey(value));
  date.setMonth(date.getMonth() + amount);
  return localDateKey(date);
}

function monthRange(value) {
  const start = parseDateKey(monthKey(value));
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  return { from: localDateKey(start), to: localDateKey(end) };
}

function calendarDays(value) {
  const first = parseDateKey(monthKey(value));
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDateKey(date);
  });
}

function formatMonth(value) {
  return parseDateKey(value).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function formatSelectedDate(value) {
  return parseDateKey(value).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatEuro(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number.isFinite(amount) ? amount : 0);
}

function normalizeTableCode(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
}

function normalizeReservations(data) {
  const rows = Array.isArray(data) ? data : data?.reservations || [];
  return rows.map((item) => ({
    id: item.id,
    tableId: item.tableId || item.table?.id || "",
    tableCode: item.tableCode || item.table?.code || "",
    tableName: item.tableName || item.table?.name || "",
    name: item.customerName || item.name || "",
    phone: item.phone || "",
    date: String(item.date || "").slice(0, 10),
    time: item.time || "",
    guests: String(item.guests || 2),
    notes: item.notes || "",
    status: item.status || "booked",
  }));
}

function normalizeStatuses(data) {
  if (Array.isArray(data)) return data;
  return data?.tables || data?.items || [];
}

function blankReservation(date) {
  return { name: "", phone: "", date, time: "", guests: "2", notes: "", status: "booked" };
}

function reservationMatchesTable(reservation, table) {
  return reservation.tableId === table.id || (
    reservation.tableCode &&
    String(reservation.tableCode).toUpperCase() === String(table.code || "").toUpperCase()
  );
}

function liveTableState(table, status, reservations, selectedDate) {
  const isToday = selectedDate === localDateKey();
  const activeReservations = reservations
    .filter((reservation) => ACTIVE_RESERVATION_STATUSES.has(reservation.status))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));

  if (isToday && (status?.status === "bill_requested" || status?.activeOrder?.paymentStatus === "pending" || status?.activeSession?.status === "closing")) {
    return { kind: "bill", label: "Conto", detail: "Richiesto", total: status?.activeOrder?.totalAmount || status?.activeSession?.totalAmount || 0 };
  }
  if (isToday && status?.status === "ready") {
    return { kind: "ready", label: "Pronto", detail: "Da servire", total: status?.activeOrder?.totalAmount || 0 };
  }
  if (isToday && ["in_progress", "pending", "active"].includes(status?.status)) {
    return { kind: "occupied", label: "Occupato", detail: status?.activeOrder ? `Ordine ${status.activeOrder.orderNumber || ""}` : "Sessione aperta", total: status?.activeOrder?.totalAmount || status?.activeSession?.totalAmount || 0 };
  }
  if (activeReservations.length) {
    const first = activeReservations[0];
    return {
      kind: "reserved",
      label: activeReservations.length > 1 ? `${activeReservations.length} prenotazioni` : "Prenotato",
      detail: `${first.time || "--:--"} · ${first.name || "Cliente"}`,
      total: 0,
    };
  }
  return { kind: "free", label: "Libero", detail: "Disponibile", total: 0 };
}

export default function Tavoli() {
  const today = localDateKey();
  const [tables, setTables] = useState([]);
  const [tableStatuses, setTableStatuses] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(monthKey(today));
  const [selectedTableId, setSelectedTableId] = useState("");
  const [editingReservationId, setEditingReservationId] = useState("");
  const [reservationForm, setReservationForm] = useState(() => blankReservation(today));
  const [tableCode, setTableCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCore = useCallback(async () => {
    const [tablesData, restaurantData, statusesData] = await Promise.all([
      apiGet("/tables"),
      apiGet("/restaurants/me"),
      apiGet("/tables/status"),
    ]);
    setTables((Array.isArray(tablesData) ? tablesData : []).filter((table) => table.isActive !== false));
    setRestaurant(restaurantData || null);
    setTableStatuses(normalizeStatuses(statusesData));
  }, []);

  const loadReservations = useCallback(async (month) => {
    const range = monthRange(month);
    const data = await apiGet(`/reservations?from=${range.from}&to=${range.to}&statuses=booked,seated,no_show&limit=200`);
    setReservations(normalizeReservations(data));
  }, []);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([loadCore(), loadReservations(visibleMonth)]);
    } catch (loadError) {
      setError(loadError.message || "Non riesco a caricare tavoli e prenotazioni. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }, [loadCore, loadReservations, visibleMonth]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const statusMap = useMemo(() => {
    const map = new Map();
    tableStatuses.forEach((item) => {
      if (item.id) map.set(`id:${item.id}`, item);
      if (item.code) map.set(`code:${String(item.code).toUpperCase()}`, item);
    });
    return map;
  }, [tableStatuses]);

  const dayReservations = useMemo(
    () => reservations
      .filter((reservation) => reservation.date === selectedDate && ACTIVE_RESERVATION_STATUSES.has(reservation.status))
      .sort((a, b) => String(a.time).localeCompare(String(b.time))),
    [reservations, selectedDate]
  );

  const reservationsByDate = useMemo(() => {
    const map = new Map();
    reservations.forEach((reservation) => {
      if (!ACTIVE_RESERVATION_STATUSES.has(reservation.status)) return;
      map.set(reservation.date, (map.get(reservation.date) || 0) + 1);
    });
    return map;
  }, [reservations]);

  const tableCards = useMemo(() => tables
    .map((table) => {
      const tableReservations = dayReservations.filter((reservation) => reservationMatchesTable(reservation, table));
      const status = statusMap.get(`id:${table.id}`) || statusMap.get(`code:${String(table.code || "").toUpperCase()}`) || null;
      return { ...table, dayReservations: tableReservations, visual: liveTableState(table, status, tableReservations, selectedDate) };
    })
    .sort((a, b) => String(a.code).localeCompare(String(b.code), "it", { numeric: true })), [dayReservations, selectedDate, statusMap, tables]);

  const selectedTable = tableCards.find((table) => table.id === selectedTableId) || null;
  const editingReservation = reservations.find((reservation) => reservation.id === editingReservationId) || null;
  const monthDays = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  function selectDate(date) {
    setSelectedDate(date);
    if (monthKey(date) !== visibleMonth) setVisibleMonth(monthKey(date));
    setEditingReservationId("");
    setReservationForm(blankReservation(date));
  }

  function selectTable(table) {
    setSelectedTableId(table.id);
    const firstReservation = table.dayReservations?.[0] || null;
    if (firstReservation) editReservation(firstReservation);
    else {
      setEditingReservationId("");
      setReservationForm(blankReservation(selectedDate));
    }
  }

  function editReservation(reservation) {
    setSelectedTableId(reservation.tableId || tableCards.find((table) => reservationMatchesTable(reservation, table))?.id || "");
    setEditingReservationId(reservation.id);
    setReservationForm({
      name: reservation.name,
      phone: reservation.phone,
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      notes: reservation.notes,
      status: reservation.status,
    });
  }

  function startReservation(table = selectedTable) {
    if (table?.id) setSelectedTableId(table.id);
    setEditingReservationId("");
    setReservationForm(blankReservation(selectedDate));
  }

  async function createTable(event) {
    event.preventDefault();
    const code = normalizeTableCode(tableCode);
    if (!code || saving) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await apiPost("/tables", { code, number: code, name: `Tavolo ${code}` });
      setTableCode("");
      setMessage(`Tavolo ${code} creato.`);
      await loadCore();
    } catch (saveError) {
      setError(saveError.message || "Errore durante la creazione del tavolo");
    } finally {
      setSaving(false);
    }
  }

  async function saveReservation(event) {
    event.preventDefault();
    if (!selectedTable || !reservationForm.name.trim() || !reservationForm.time || saving) return;
    const payload = {
      tableId: selectedTable.id,
      tableCode: selectedTable.code,
      customerName: reservationForm.name.trim(),
      phone: reservationForm.phone.trim(),
      date: reservationForm.date,
      time: reservationForm.time,
      guests: Number(reservationForm.guests || 2),
      notes: reservationForm.notes.trim(),
      status: reservationForm.status,
    };

    try {
      setSaving(true);
      setError("");
      setMessage("");
      if (editingReservationId) await apiPatch(`/reservations/${editingReservationId}`, payload);
      else await apiPost("/reservations", payload);
      setMessage(editingReservationId ? "Prenotazione aggiornata." : "Prenotazione aggiunta al tavolo.");
      const targetMonth = payload.date.slice(0, 7);
      setSelectedDate(payload.date);
      setVisibleMonth(targetMonth);
      setEditingReservationId("");
      setReservationForm(blankReservation(payload.date));
      await loadReservations(targetMonth);
    } catch (saveError) {
      setError(saveError.message || "Errore durante il salvataggio della prenotazione");
    } finally {
      setSaving(false);
    }
  }

  async function cancelReservation() {
    if (!editingReservationId || saving) return;
    try {
      setSaving(true);
      setError("");
      await apiDelete(`/reservations/${editingReservationId}`);
      setMessage("Prenotazione cancellata.");
      setEditingReservationId("");
      setReservationForm(blankReservation(selectedDate));
      await loadReservations(visibleMonth);
    } catch (deleteError) {
      setError(deleteError.message || "Errore durante la cancellazione");
    } finally {
      setSaving(false);
    }
  }

  async function copyQrLink() {
    if (!selectedTable || !restaurant?.slug) return;
    const link = `${window.location.origin}/menu/${restaurant.slug}/${selectedTable.qrToken}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setMessage("Link del tavolo copiato.");
  }

  const menuLink = selectedTable && restaurant?.slug
    ? `${window.location.origin}/menu/${restaurant.slug}/${selectedTable.qrToken}`
    : "";

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <main className="tables-calendar-page">
        <section className="tables-calendar-toolbar">
          <div>
            <span>Sala e prenotazioni</span>
            <h1>{tables.length} tavoli</h1>
          </div>
          <div className="tables-calendar-legend" aria-label="Legenda stati tavolo">
            <span><i className="free" />Libero</span>
            <span><i className="reserved" />Prenotato</span>
            <span><i className="occupied" />Occupato</span>
            <span><i className="bill" />Conto</span>
          </div>
          <form onSubmit={createTable}>
            <input value={tableCode} onChange={(event) => setTableCode(event.target.value)} placeholder="N. tavolo" aria-label="Numero tavolo" />
            <button type="submit" disabled={saving || !tableCode.trim()}>Aggiungi</button>
            <button type="button" className="secondary" onClick={() => { window.location.href = "/onboarding?qr=1"; }}>Stampe QR</button>
          </form>
        </section>

        {error ? <div className="tables-inline-message is-error"><b>Attenzione</b><span>{error}</span><button type="button" onClick={loadPage}>Riprova</button></div> : null}
        {message ? <div className="tables-inline-message is-success"><span>{message}</span></div> : null}

        <section className="table-calendar-card">
          <header>
            <div>
              <span>Calendario prenotazioni</span>
              <h2>{formatMonth(visibleMonth)}</h2>
            </div>
            <div>
              <button type="button" title="Mese precedente" onClick={() => setVisibleMonth((value) => addMonths(value, -1))}>‹</button>
              <button type="button" onClick={() => { setVisibleMonth(monthKey(today)); selectDate(today); }}>Oggi</button>
              <button type="button" title="Mese successivo" onClick={() => setVisibleMonth((value) => addMonths(value, 1))}>›</button>
            </div>
          </header>
          <div className="table-calendar-weekdays">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="table-calendar-grid">
            {monthDays.map((date) => {
              const count = reservationsByDate.get(date) || 0;
              const outside = monthKey(date) !== visibleMonth;
              return (
                <button
                  type="button"
                  key={date}
                  className={`${date === selectedDate ? "is-selected" : ""} ${date === today ? "is-today" : ""} ${outside ? "is-outside" : ""}`}
                  onClick={() => selectDate(date)}
                >
                  <b>{parseDateKey(date).getDate()}</b>
                  {count ? <small>{count}</small> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="tables-day-summary">
          <div>
            <span>Giorno selezionato</span>
            <h2>{formatSelectedDate(selectedDate)}</h2>
          </div>
          <strong>{dayReservations.length} {dayReservations.length === 1 ? "prenotazione" : "prenotazioni"}</strong>
          <div className="tables-day-reservations">
            {dayReservations.length ? dayReservations.map((reservation) => (
              <button type="button" key={reservation.id} onClick={() => editReservation(reservation)}>
                <b>{reservation.time}</b>
                <span>{reservation.tableName || `Tavolo ${reservation.tableCode || "?"}`}</span>
                <small>{reservation.name}</small>
              </button>
            )) : <p>Nessuna prenotazione: tutti i tavoli sono disponibili.</p>}
          </div>
        </section>

        <section className="tables-calendar-layout">
          <div className="tables-compact-map">
            <header>
              <div>
                <span>Mappa del giorno</span>
                <h2>Scegli un tavolo</h2>
              </div>
              <button type="button" onClick={loadPage} disabled={loading}>{loading ? "Carico..." : "Aggiorna"}</button>
            </header>

            {!loading && !tableCards.length ? (
              <div className="tables-calendar-empty">
                <b>Nessun tavolo configurato</b>
                <span>Inserisci il numero in alto e premi Aggiungi.</span>
              </div>
            ) : null}

            <div className="tables-compact-grid">
              {tableCards.map((table) => (
                <button
                  type="button"
                  key={table.id}
                  onClick={() => selectTable(table)}
                  className={`table-compact table-compact--${table.visual.kind} ${selectedTableId === table.id ? "is-selected" : ""}`}
                >
                  <b>{table.code || table.name}</b>
                  <span>{table.visual.label}</span>
                  <small>{table.visual.detail}</small>
                  {table.visual.total ? <em>{formatEuro(table.visual.total)}</em> : null}
                </button>
              ))}
            </div>
          </div>

          <aside className="table-booking-panel">
            {selectedTable ? (
              <>
                <header>
                  <div>
                    <span>Tavolo selezionato</span>
                    <h2>{selectedTable.name || `Tavolo ${selectedTable.code}`}</h2>
                  </div>
                  <button type="button" title="Chiudi" onClick={() => setSelectedTableId("")}>×</button>
                </header>

                <div className={`table-booking-status is-${selectedTable.visual.kind}`}>
                  <b>{selectedTable.visual.label}</b>
                  <span>{selectedTable.visual.detail}</span>
                </div>

                {selectedTable.dayReservations.length ? (
                  <div className="table-booking-existing">
                    <span>Prenotazioni del tavolo</span>
                    {selectedTable.dayReservations.map((reservation) => (
                      <button type="button" key={reservation.id} onClick={() => editReservation(reservation)}>
                        <b>{reservation.time}</b>
                        <span>{reservation.name}</span>
                        <small>{reservation.guests} persone · {STATUS_LABELS[reservation.status]}</small>
                      </button>
                    ))}
                    <button type="button" className="add" onClick={() => startReservation(selectedTable)}>+ Altra prenotazione</button>
                  </div>
                ) : null}

                <form className="table-booking-form" onSubmit={saveReservation}>
                  <div>
                    <span>{editingReservation ? "Modifica prenotazione" : "Nuova prenotazione"}</span>
                    <b>{formatSelectedDate(reservationForm.date)}</b>
                  </div>
                  <label>Nome cliente<input required value={reservationForm.name} onChange={(event) => setReservationForm((value) => ({ ...value, name: event.target.value }))} /></label>
                  <div className="table-booking-form__row">
                    <label>Data<input type="date" required value={reservationForm.date} onChange={(event) => setReservationForm((value) => ({ ...value, date: event.target.value }))} /></label>
                    <label>Ora<input type="time" required value={reservationForm.time} onChange={(event) => setReservationForm((value) => ({ ...value, time: event.target.value }))} /></label>
                    <label>Persone<input type="number" min="1" max="300" required value={reservationForm.guests} onChange={(event) => setReservationForm((value) => ({ ...value, guests: event.target.value }))} /></label>
                  </div>
                  <label>Telefono<input inputMode="tel" value={reservationForm.phone} onChange={(event) => setReservationForm((value) => ({ ...value, phone: event.target.value }))} /></label>
                  <label>Stato<select value={reservationForm.status} onChange={(event) => setReservationForm((value) => ({ ...value, status: event.target.value }))}><option value="booked">Prenotata</option><option value="seated">Arrivata</option><option value="no_show">Non presentato</option></select></label>
                  <label>Note<textarea rows="2" value={reservationForm.notes} onChange={(event) => setReservationForm((value) => ({ ...value, notes: event.target.value }))} /></label>
                  <div className="table-booking-actions">
                    <button type="submit" disabled={saving}>{saving ? "Salvo..." : editingReservation ? "Aggiorna" : "Prenota tavolo"}</button>
                    {editingReservation ? <button type="button" className="danger" onClick={cancelReservation}>Cancella</button> : null}
                  </div>
                </form>

                <div className="table-qr-mini">
                  {menuLink ? <QRCodeCanvas value={menuLink} size={92} includeMargin /> : null}
                  <div><b>QR del tavolo</b><a href={menuLink} target="_blank" rel="noreferrer">Apri menu cliente</a><button type="button" onClick={copyQrLink}>Copia link</button></div>
                </div>
              </>
            ) : (
              <div className="table-booking-placeholder">
                <b>Seleziona un tavolo</b>
                <p>Il giorno è già impostato. Tocca un tavolo verde per aggiungere la prenotazione.</p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
