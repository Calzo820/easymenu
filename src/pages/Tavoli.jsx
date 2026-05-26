import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import CommandDock from "../components/CommandDock";
import Modal from "../components/Modal";
import { apiGet } from "../lib/api";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";

function getRistoranteAttivo() {
  return localStorage.getItem("ristorante_attivo") || "";
}

function ordiniKey(nome) {
  return `ordini_${nome}`;
}

function tavoliKey(nome) {
  return `tavoli_${nome}`;
}

function prenotazioniKey(nome) {
  return `prenotazioni_${nome}`;
}

function mapOrderToLegacy(order) {
  return {
    ...order,
    tavolo: order?.table?.name || order?.table?.code || order?.table?.number || order?.tavolo || "-",
    pagamento: order?.paymentMethod || order?.pagamento || "Non indicato",
    totale: order?.totalAmount ?? order?.totale ?? 0,
    nota: order?.notes || order?.nota || "",
    chiusoIl: order?.closedAt || order?.servedAt || order?.updatedAt || order?.chiusoIl || order?.time,
    time: order?.createdAt || order?.time || Date.now(),
    piatti: (order?.items || order?.piatti || []).map((item) => ({
      ...item,
      nome: item?.nameSnapshot || item?.nome || item?.menuItem?.name || "Articolo",
      qty: item?.quantity ?? item?.qty ?? 1,
      prezzo: item?.priceSnapshot ?? item?.prezzo ?? 0,
      categoria: item?.categorySnapshot || item?.categoria || item?.menuItem?.category || "Altro",
      note: item?.notes || item?.note || "",
      stato: order?.status === "pending" ? "nuovo" : order?.status === "in_progress" ? "preparazione" : order?.status === "ready" ? "pronto" : item?.stato || order?.status || "chiuso",
    })),
  };
}

function isBevanda(categoria) {
  return (categoria || "").toLowerCase().trim() === "bevande";
}

function formatDateTime(date, time) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}${time ? ` • ${time}` : ""}`;
}

function getGridConfig(total) {
  if (total <= 12) return { cols: 4, gap: 14 };
  if (total <= 20) return { cols: 5, gap: 12 };
  if (total <= 30) return { cols: 6, gap: 10 };
  if (total <= 42) return { cols: 7, gap: 9 };
  if (total <= 56) return { cols: 8, gap: 8 };
  if (total <= 72) return { cols: 9, gap: 8 };
  return { cols: 10, gap: 7 };
}

function sameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function Tavoli() {
  const [ordini, setOrdini] = useState([]);
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [tavoloSelezionato, setTavoloSelezionato] = useState(null);
  const [modalAperta, setModalAperta] = useState(false);
  const [filtroPrenotazioni, setFiltroPrenotazioni] = useState("tutte");
  const [totaleTavoli, setTotaleTavoli] = useState(12);

  const [clientePrenotazione, setClientePrenotazione] = useState("");
  const [dataPrenotazione, setDataPrenotazione] = useState("");
  const [oraPrenotazione, setOraPrenotazione] = useState("");
  const [personePrenotazione, setPersonePrenotazione] = useState("");
  const [notePrenotazione, setNotePrenotazione] = useState("");

  const ristoranteAttivo = getRistoranteAttivo();

  useEffect(() => {
    let cancelled = false;

    async function syncTavoli() {
      if (!ristoranteAttivo) return;

      const datiPrenotazioni = JSON.parse(
        localStorage.getItem(prenotazioniKey(ristoranteAttivo)) || "[]"
      );
      if (!cancelled) setPrenotazioni(Array.isArray(datiPrenotazioni) ? datiPrenotazioni : []);

      try {
        const data = await apiGet("/tables/status");
        const tables = Array.isArray(data?.tables) ? data.tables : [];
        const activeOrders = tables.map((table) => table.activeOrder).filter(Boolean);
        if (!cancelled) {
          setOrdini(activeOrders.map(mapOrderToLegacy));
          setTotaleTavoli(data?.totalTables || tables.length || 12);
        }
      } catch (error) {
        console.warn("Tavoli backend non disponibile, uso dati locali", error);
        const datiOrdini = JSON.parse(localStorage.getItem(ordiniKey(ristoranteAttivo)) || "[]");
        if (!cancelled) {
          setOrdini(Array.isArray(datiOrdini) ? datiOrdini : []);
          setTotaleTavoli(Number(localStorage.getItem(tavoliKey(ristoranteAttivo)) || 12));
        }
      }
    }

    syncTavoli();
    const timer = setInterval(syncTavoli, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ristoranteAttivo]);

  const gridConfig = useMemo(() => getGridConfig(totaleTavoli), [totaleTavoli]);

  function statoTavolo(numero) {
    const ordine = ordini.find((o) => String(o.tavolo) === String(numero));
    const prenotazioniTavolo = prenotazioni.filter((p) => String(p.tavolo) === String(numero));

    if (!ordine) {
      if (prenotazioniTavolo.length > 0) {
        return {
          testo: "Prenotato",
          bg: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
          dettaglio: `${prenotazioniTavolo.length} prenotazione/i`,
          articoli: 0,
        };
      }

      return {
        testo: "Libero",
        bg: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
        dettaglio: "Nessun ordine attivo",
        articoli: 0,
      };
    }

    const piattiCucina = ordine.piatti.filter((p) => !isBevanda(p.categoria));
    const totaleArticoli = ordine.piatti.reduce((acc, p) => acc + Number(p.qty || 0), 0);

    if (piattiCucina.length === 0) {
      return {
        testo: "Solo bevande",
        bg: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
        dettaglio: "Ordine senza cucina",
        articoli: totaleArticoli,
      };
    }

    const tuttiPronti = piattiCucina.every((p) => p.stato === "pronto");
    const almenoUnoPreparazione = piattiCucina.some((p) => p.stato === "preparazione");
    const almenoUnoNuovo = piattiCucina.some((p) => p.stato === "nuovo");

    if (tuttiPronti) {
      return {
        testo: "Pronto",
        bg: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
        dettaglio: "Tutto pronto da servire",
        articoli: totaleArticoli,
      };
    }

    if (almenoUnoPreparazione) {
      return {
        testo: "In preparazione",
        bg: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
        dettaglio: "Cucina al lavoro",
        articoli: totaleArticoli,
      };
    }

    if (almenoUnoNuovo) {
      return {
        testo: "Nuovo ordine",
        bg: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
        dettaglio: "Ordine appena arrivato",
        articoli: totaleArticoli,
      };
    }

    return {
      testo: "Occupato",
      bg: "linear-gradient(135deg, #475569 0%, #64748b 100%)",
      dettaglio: "Tavolo attivo",
      articoli: totaleArticoli,
    };
  }

  const riepilogo = useMemo(() => {
    let liberi = 0;
    let nuovi = 0;
    let preparazione = 0;
    let pronti = 0;
    let soloBevande = 0;
    let prenotati = 0;

    for (let i = 1; i <= totaleTavoli; i++) {
      const stato = statoTavolo(i).testo;
      if (stato === "Libero") liberi++;
      if (stato === "Nuovo ordine") nuovi++;
      if (stato === "In preparazione") preparazione++;
      if (stato === "Pronto") pronti++;
      if (stato === "Solo bevande") soloBevande++;
      if (stato === "Prenotato") prenotati++;
    }

    return { liberi, nuovi, preparazione, pronti, soloBevande, prenotati };
  }, [ordini, prenotazioni, totaleTavoli]);

  const prenotazioniTavoloSelezionato = useMemo(() => {
    const now = new Date();
    const domani = new Date();
    domani.setDate(now.getDate() + 1);

    const inizioSettimana = new Date();
    const fineSettimana = new Date();
    fineSettimana.setDate(now.getDate() + 7);

    return prenotazioni
      .filter((p) => String(p.tavolo) === String(tavoloSelezionato))
      .filter((p) => {
        if (!p.data) return true;

        const dataPren = new Date(`${p.data}T00:00:00`);

        if (filtroPrenotazioni === "oggi") {
          return sameDay(dataPren, now);
        }

        if (filtroPrenotazioni === "domani") {
          return sameDay(dataPren, domani);
        }

        if (filtroPrenotazioni === "settimana") {
          return dataPren >= inizioSettimana && dataPren <= fineSettimana;
        }

        return true;
      })
      .sort((a, b) => {
        const aDate = `${a.data || ""}T${a.ora || "00:00"}`;
        const bDate = `${b.data || ""}T${b.ora || "00:00"}`;
        return new Date(aDate) - new Date(bDate);
      });
  }, [prenotazioni, tavoloSelezionato, filtroPrenotazioni]);

  function salvaPrenotazione() {
    if (!tavoloSelezionato) return;
    if (!clientePrenotazione.trim() || !dataPrenotazione) return;

    const nuovePrenotazioni = [...prenotazioni];
    nuovePrenotazioni.push({
      id: Date.now(),
      tavolo: String(tavoloSelezionato),
      cliente: clientePrenotazione.trim(),
      data: dataPrenotazione,
      ora: oraPrenotazione,
      persone: Number(personePrenotazione || 0),
      note: notePrenotazione.trim(),
      creatoIl: Date.now(),
    });

    setPrenotazioni(nuovePrenotazioni);
    localStorage.setItem(
      prenotazioniKey(ristoranteAttivo),
      JSON.stringify(nuovePrenotazioni)
    );

    setClientePrenotazione("");
    setDataPrenotazione("");
    setOraPrenotazione("");
    setPersonePrenotazione("");
    setNotePrenotazione("");
  }

  function eliminaPrenotazione(id) {
    const nuovePrenotazioni = prenotazioni.filter((p) => p.id !== id);
    setPrenotazioni(nuovePrenotazioni);
    localStorage.setItem(
      prenotazioniKey(ristoranteAttivo),
      JSON.stringify(nuovePrenotazioni)
    );
  }

  const gridHeight = "calc(100vh - 300px)";
  const righe = Math.ceil(totaleTavoli / gridConfig.cols) || 1;
  const cardHeight = `calc((${gridHeight} - ${(righe - 1) * gridConfig.gap}px) / ${righe})`;

  const textScale =
    totaleTavoli <= 20
      ? { title: 20, state: 14, detail: 11, badge: 11 }
      : totaleTavoli <= 42
      ? { title: 18, state: 13, detail: 10, badge: 10 }
      : { title: 16, state: 12, detail: 9, badge: 9 };

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <CommandDock mode="cashier" />

      <div style={appShellStyle}>
        <div className="app-shell">
          <div className="glass-hero" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div>
                <div className="topbar-chip" style={{ marginBottom: 12 }}>
                  <span className="status-dot" style={{ background: "#22c55e" }} />
                  Mappa tavoli
                </div>
                <h1 style={{ margin: 0, fontSize: 34 }}>Controllo sala e prenotazioni</h1>
                <p style={{ marginTop: 10, opacity: 0.9 }}>
                  {ristoranteAttivo} — tutti i tavoli visibili nella schermata PC
                </p>
              </div>

              <div className="topbar-chip">
                Tavoli totali: <b>{totaleTavoli}</b>
              </div>
            </div>
          </div>

          <div
            className="os-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginBottom: 16,
            }}
          >
            <div className="metric-card">
              <div className="metric-label">Liberi</div>
              <div className="metric-value">{riepilogo.liberi}</div>
              <div className="metric-badge">disponibili</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Nuovi ordini</div>
              <div className="metric-value">{riepilogo.nuovi}</div>
              <div className="metric-badge">attenzione sala</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">In preparazione</div>
              <div className="metric-value">{riepilogo.preparazione}</div>
              <div className="metric-badge">cucina attiva</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Pronti</div>
              <div className="metric-value">{riepilogo.pronti}</div>
              <div className="metric-badge">da servire</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Prenotati</div>
              <div className="metric-value">{riepilogo.prenotati}</div>
              <div className="metric-badge">anche futuri</div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
              gap: gridConfig.gap,
              height: gridHeight,
            }}
          >
            {Array.from({ length: totaleTavoli }, (_, i) => {
              const tavolo = i + 1;
              const stato = statoTavolo(tavolo);

              return (
                <button
                  key={tavolo}
                  onClick={() => {
                    setTavoloSelezionato(tavolo);
                    setModalAperta(true);
                  }}
                  className="section-card"
                  style={{
                    height: cardHeight,
                    minHeight: 72,
                    background: stato.bg,
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "stretch",
                    textAlign: "left",
                    padding: totaleTavoli > 42 ? 10 : 12,
                    border: "none",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease",
                    cursor: "pointer",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 14px 22px rgba(2,8,23,0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  <div>
                    <div style={{ fontSize: textScale.title, fontWeight: 900, marginBottom: 6 }}>
                      T{tavolo}
                    </div>

                    <div style={{ fontSize: textScale.state, fontWeight: 800, lineHeight: 1.1 }}>
                      {stato.testo}
                    </div>

                    <div
                      style={{
                        fontSize: textScale.detail,
                        opacity: 0.95,
                        marginTop: 6,
                        lineHeight: 1.2,
                      }}
                    >
                      {stato.dettaglio}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      background: "rgba(255,255,255,0.18)",
                      padding: "6px 9px",
                      borderRadius: 999,
                      fontWeight: 800,
                      fontSize: textScale.badge,
                      display: "inline-flex",
                      alignSelf: "flex-start",
                    }}
                  >
                    {stato.articoli} articoli
                  </div>
                </button>
              );
            })}
          </div>

          {modalAperta && tavoloSelezionato && (
            <Modal
              onClose={() => {
                setModalAperta(false);
                setTavoloSelezionato(null);
              }}
              maxWidth={1000}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "0.95fr 1.05fr",
                  gap: 20,
                  alignItems: "start",
                  paddingTop: 10,
                }}
              >
                <div className="section-card" style={{ boxShadow: "none", background: "#fff" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      marginBottom: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div className="panel-title" style={{ marginBottom: 2 }}>
                        Prenota tavolo {tavoloSelezionato}
                      </div>
                      <div className="panel-subtitle">
                        Inserisci anche prenotazioni per date future
                      </div>
                    </div>

                    <div className="topbar-chip">
                      Stato: {statoTavolo(tavoloSelezionato).testo}
                    </div>
                  </div>

                  <div
                    className="os-grid"
                    style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}
                  >
                    <input
                      type="text"
                      placeholder="Nome cliente"
                      value={clientePrenotazione}
                      onChange={(e) => setClientePrenotazione(e.target.value)}
                      style={inputStyle}
                    />

                    <input
                      type="number"
                      min="1"
                      placeholder="Numero persone"
                      value={personePrenotazione}
                      onChange={(e) => setPersonePrenotazione(e.target.value)}
                      style={inputStyle}
                    />

                    <input
                      type="date"
                      value={dataPrenotazione}
                      onChange={(e) => setDataPrenotazione(e.target.value)}
                      style={inputStyle}
                    />

                    <input
                      type="time"
                      value={oraPrenotazione}
                      onChange={(e) => setOraPrenotazione(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <textarea
                    placeholder="Note prenotazione"
                    value={notePrenotazione}
                    onChange={(e) => setNotePrenotazione(e.target.value)}
                    style={textareaStyle}
                  />

                  <button
                    onClick={salvaPrenotazione}
                    style={{
                      marginTop: 14,
                      border: "none",
                      borderRadius: 14,
                      padding: "14px 16px",
                      background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
                      color: "white",
                      fontWeight: 900,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Salva prenotazione
                  </button>
                </div>

                <div className="section-card" style={{ boxShadow: "none", background: "#fff" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div className="panel-title">Prenotazioni tavolo {tavoloSelezionato}</div>
                      <div className="panel-subtitle">Elenco prenotazioni attuali e future</div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[
                        ["tutte", "Tutte"],
                        ["oggi", "Oggi"],
                        ["domani", "Domani"],
                        ["settimana", "Settimana"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setFiltroPrenotazioni(key)}
                          style={{
                            border: "none",
                            borderRadius: 999,
                            padding: "8px 12px",
                            background: filtroPrenotazioni === key ? "#123b6b" : "#e5e7eb",
                            color: filtroPrenotazioni === key ? "white" : "#123b6b",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                    {prenotazioniTavoloSelezionato.length === 0 ? (
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 14,
                          padding: 14,
                          color: "#64748b",
                        }}
                      >
                        Nessuna prenotazione per questo filtro.
                      </div>
                    ) : (
                      prenotazioniTavoloSelezionato.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 16,
                            padding: 14,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 900, fontSize: 16, color: "#123b6b" }}>
                                {p.cliente}
                              </div>
                              <div style={{ marginTop: 6, color: "#64748b", fontSize: 14 }}>
                                {formatDateTime(p.data, p.ora)}
                              </div>
                              <div style={{ marginTop: 6, color: "#334155", fontSize: 14 }}>
                                Persone: <b>{p.persone || 0}</b>
                              </div>
                            </div>

                            <button
                              onClick={() => eliminaPrenotazione(p.id)}
                              style={{
                                border: "none",
                                borderRadius: 12,
                                padding: "10px 12px",
                                background: "#ef4444",
                                color: "white",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              Elimina
                            </button>
                          </div>

                          {p.note ? (
                            <div
                              style={{
                                marginTop: 10,
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                padding: 10,
                                borderRadius: 12,
                                color: "#475569",
                              }}
                            >
                              <b>Note:</b> {p.note}
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: "12px 14px",
  background: "white",
  color: "#123b6b",
  outline: "none",
};

const textareaStyle = {
  width: "100%",
  minHeight: 90,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: 12,
  background: "white",
  color: "#123b6b",
  outline: "none",
  resize: "vertical",
};

export default Tavoli;