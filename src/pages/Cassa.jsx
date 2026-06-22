import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import CommandDock from "../components/CommandDock";
import Modal from "../components/Modal";
import OperationalFlowStrip from "../components/ops/OperationalFlowStrip";
import HighVolumeCashDesk from "../components/ops/HighVolumeCashDesk";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";
import { createRestaurantSocket } from "../lib/realtime";
import { API_URL, getAuthHeaders } from "../lib/api";

function getRistoranteAttivo() {
  return localStorage.getItem("ristorante_attivo") || "";
}

function ordiniKey(nome) {
  return `ordini_${nome}`;
}

function storicoKey(nome) {
  return `storico_${nome}`;
}

function tavoliKey(nome) {
  return `tavoli_${nome}`;
}

function ordineConfermatoKey(nome, tavolo) {
  return `ordine_confermato_${nome}_${tavolo}`;
}

function formatEuro(value) {
  return `€ ${Number(value || 0).toFixed(2)}`;
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDateTime(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("it-IT");
}

function differenzaMinuti(timestamp) {
  if (!timestamp) return 0;
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 60000));
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

function isBevanda(categoria) {
  return (categoria || "").toLowerCase().trim() === "bevande";
}

function isPiattoPronto(piatto) {
  return (piatto?.stato || "").toLowerCase() === "pronto";
}

function getStatoOrdineCassa(ordine) {
  if (!ordine || !Array.isArray(ordine.piatti) || ordine.piatti.length === 0) {
    return {
      label: "Libero",
      bg: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
      detail: "Nessun ordine aperto",
    };
  }

  if (ordine.billRequested || ordine.paymentStatus === "pending") {
    return {
      label: "Conto richiesto",
      bg: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
      detail: "Il cliente ha richiesto il conto",
    };
  }

  const tuttiPronti = ordine.piatti.every((p) => isPiattoPronto(p) || isBevanda(p.categoria));
  const almenoUnoPreparazione = ordine.piatti.some(
    (p) => (p.stato || "").toLowerCase() === "preparazione"
  );
  const almenoUnoNuovo = ordine.piatti.some((p) => (p.stato || "").toLowerCase() === "nuovo");

  if (tuttiPronti) {
    return {
      label: "Pronto",
      bg: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      detail: "Ordine pronto per la consegna / chiusura",
    };
  }

  if (almenoUnoPreparazione) {
    return {
      label: "In preparazione",
      bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      detail: "Ci sono piatti ancora in lavorazione",
    };
  }

  if (almenoUnoNuovo) {
    return {
      label: "Nuovo ordine",
      bg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      detail: "Ordine arrivato da poco",
    };
  }

  return {
    label: "Conto aperto",
    bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    detail: "Tavolo con ordine attivo",
  };
}

function subtototaleOrdineSafe(ordine) {
  return (ordine?.piatti || []).reduce((acc, p) => {
    return acc + parseNumber(p.prezzo) * parseNumber(p.qty || 0);
  }, 0);
}

function mapBackendItemStatus(status) {
  const normalized = String(status || "").toLowerCase().trim();
  if (normalized === "ready") return "pronto";
  if (normalized === "in_progress") return "preparazione";
  if (normalized === "served") return "pronto";
  if (normalized === "cancelled") return "annullato";
  return "nuovo";
}

function mapNotesToServizio(notes) {
  const text = String(notes || "").toLowerCase();
  if (text.includes("porta dopo")) return "dopo";
  return "subito";
}

function mapBackendOrderToLegacyShape(order) {
  const tableRaw =
    order?.table?.name ||
    order?.tableName ||
    order?.tableNumber ||
    order?.table?.number ||
    order?.table?.id ||
    order?.tableId ||
    "";

  const tavolo = String(tableRaw).replace(/[^\d]/g, "") || String(tableRaw || "");

  const rawItems = order?.items || order?.orderItems || order?.lines || [];
  const piatti = rawItems.map((item) => ({
    id: item.id,
    menuItemId: item.menuItemId || item.menuItem?.id || null,
    nome:
      item.nameSnapshot ||
      item.name ||
      item.menuItem?.name ||
      item.nome ||
      "Articolo",
    prezzo:
      item.priceSnapshot ??
      item.price ??
      item.prezzo ??
      item.menuItem?.price ??
      0,
    qty: parseNumber(item.quantity ?? item.qty ?? 1),
    stato: mapBackendItemStatus(item.status || order?.status),
    servizio: mapNotesToServizio(item.notes),
    categoria:
      item.categorySnapshot ||
      item.category ||
      item.menuItem?.category ||
      item.categoria ||
      "Altro",
    preparationArea: item.preparationArea || item.menuItem?.preparationArea || "",
    nota: item.notes || "",
  }));

  return {
    id: order.id,
    backendId: order.id,
    publicToken: order.publicToken || null,
    sessionId: order.tableSessionId || order.sessionId || null,
    tavolo,
    tavoloLabel: order?.table?.name || `Tavolo ${tavolo || "?"}`,
    piatti,
    nota: order.notes || "",
    time: order.createdAt || order.updatedAt || order.acceptedAt || order.readyAt || null,
    stato: order.status || "pending",
    paymentStatus: order.paymentStatus || "unpaid",
    paymentMethod: order.paymentMethod || "",
    billRequested:
      Boolean(order.billRequested) ||
      order.paymentStatus === "pending" ||
      order.tableSessionStatus === "closing" ||
      order.activeSession?.status === "closing" ||
      order.sessionStatus === "closing",
    billRequestedAt: order.billRequestedAt || order.requestedAt || null,
    discountAmount: parseNumber(order.discountAmount),
    extraAmount: parseNumber(order.extraAmount),
    closedAt: order.closedAt || null,
    raw: order,
  };
}

function normalizeStatusResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tables)) return data.tables;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function createBellSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();

    return () => {
      const now = ctx.currentTime;

      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.type = "sine";
      o1.frequency.setValueAtTime(880, now);
      g1.gain.setValueAtTime(0.0001, now);
      g1.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      o1.connect(g1);
      g1.connect(ctx.destination);
      o1.start(now);
      o1.stop(now + 0.23);

      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "sine";
      o2.frequency.setValueAtTime(1174, now + 0.08);
      g2.gain.setValueAtTime(0.0001, now + 0.08);
      g2.gain.exponentialRampToValueAtTime(0.08, now + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start(now + 0.08);
      o2.stop(now + 0.29);
    };
  } catch {
    return null;
  }
}

function Cassa() {
  const [ordini, setOrdini] = useState([]);
  const [extraInputs, setExtraInputs] = useState({});
  const [impostazioniConto, setImpostazioniConto] = useState({});
  const [tavoloStampa, setTavoloStampa] = useState(null);
  const [tavoloSelezionato, setTavoloSelezionato] = useState(null);
  const [modalAperta, setModalAperta] = useState(false);
  const [closing, setClosing] = useState(false);
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(true);
  const [totaleTavoli, setTotaleTavoli] = useState(
    Number(localStorage.getItem(tavoliKey(getRistoranteAttivo())) || 12)
  );
  const [ultimoEvento, setUltimoEvento] = useState(null);
  const [tavoliInEvidenza, setTavoliInEvidenza] = useState({});
  const [richiesteConto, setRichiesteConto] = useState({});
  const [richiesteCameriere, setRichiesteCameriere] = useState({});

  const socketRef = useRef(null);
  const bellRef = useRef(null);

  const ristoranteAttivo = getRistoranteAttivo();
  const gridConfig = useMemo(() => getGridConfig(totaleTavoli), [totaleTavoli]);

  async function syncOrdini() {
    if (!ristoranteAttivo) {
      setOrdini([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/tables/status`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Fallback locale");
      }

      const data = await response.json();
      const tableStates = normalizeStatusResponse(data);

      const mappedOrdini = tableStates
        .map((table) => {
          const activeOrder =
            table.activeOrder ||
            table.currentOrder ||
            table.order ||
            (Array.isArray(table.orders) ? table.orders.find((o) => !o.closedAt) : null);

          if (!activeOrder) return null;

          return mapBackendOrderToLegacyShape({
            ...activeOrder,
            table: activeOrder.table || {
              id: table.id,
              name: table.name || `Tavolo ${table.number || table.id || ""}`,
              number: table.number || null,
            },
            sessionId: activeOrder.sessionId || table.activeSession?.id || null,
            tableSessionId: activeOrder.tableSessionId || table.activeSession?.id || null,
            activeSession: table.activeSession || null,
            billRequested: Boolean(activeOrder.billRequested) || table.status === "bill_requested",
            tableSessionStatus: activeOrder.tableSessionStatus || table.activeSession?.status || null,
          });
        })
        .filter(Boolean)
        .sort((a, b) => Number(a.tavolo) - Number(b.tavolo));

      setOrdini(mappedOrdini);
      setRichiesteConto((prev) => {
        const next = { ...prev };
        mappedOrdini.forEach((ordine) => {
          if (ordine.billRequested || ordine.paymentStatus === "pending") {
            next[ordine.tavolo] = {
              tavolo: ordine.tavolo,
              orderId: ordine.backendId || ordine.id,
              requestedAt: ordine.billRequestedAt || Date.now(),
            };
          }
        });
        return next;
      });

      const totalFromBackend =
        data?.totalTables ||
        tableStates.length ||
        Number(localStorage.getItem(tavoliKey(ristoranteAttivo)) || 12);

      setTotaleTavoli(Math.max(1, Number(totalFromBackend) || 12));

      if (mappedOrdini.length > 0) {
        localStorage.setItem(ordiniKey(ristoranteAttivo), JSON.stringify(mappedOrdini));
      }
    } catch {
      const dati = JSON.parse(localStorage.getItem(ordiniKey(ristoranteAttivo)) || "[]");
      setOrdini(Array.isArray(dati) ? dati : []);
      setTotaleTavoli(Number(localStorage.getItem(tavoliKey(ristoranteAttivo)) || 12));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bellRef.current = createBellSound() || null;
  }, []);

  useEffect(() => {
    let timer;

    syncOrdini();
    timer = setInterval(syncOrdini, 4000);

    const onStorage = () => {
      const dati = JSON.parse(localStorage.getItem(ordiniKey(ristoranteAttivo)) || "[]");
      setOrdini(Array.isArray(dati) ? dati : []);
    };

    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [ristoranteAttivo]);

  useEffect(() => {
    const socket = createRestaurantSocket();

    socketRef.current = socket;

    const handleRefresh = async (eventName, payload) => {
      setUltimoEvento({
        type: eventName,
        payload,
        at: Date.now(),
      });

      const tableName =
        payload?.tableName ||
        payload?.table ||
        payload?.tableLabel ||
        payload?.tableNumber ||
        "";

      const tableNumber = String(tableName).replace(/[^\d]/g, "");
      if (tableNumber) {
        if (eventName === "call-bill") {
          setRichiesteConto((prev) => ({
            ...prev,
            [tableNumber]: {
              tavolo: tableNumber,
              orderId: payload?.orderId || null,
              requestedAt: payload?.requestedAt || Date.now(),
            },
          }));
        }

        if (eventName === "call-staff") {
          setRichiesteCameriere((prev) => ({
            ...prev,
            [tableNumber]: {
              tavolo: tableNumber,
              orderId: payload?.orderId || null,
              reason: payload?.reason || "assistenza",
              requestedAt: payload?.requestedAt || Date.now(),
            },
          }));
        }

        setTavoliInEvidenza((prev) => ({
          ...prev,
          [tableNumber]: Date.now(),
        }));

        setTimeout(() => {
          setTavoliInEvidenza((prev) => {
            const next = { ...prev };
            delete next[tableNumber];
            return next;
          });
        }, 8000);
      }

      try {
        if (bellRef.current) {
          bellRef.current();
        }
      } catch {
        // silenzioso
      }

      await syncOrdini();
    };

    socket.on("connect", () => {
      console.log("Socket cassa connesso:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket cassa disconnesso");
    });

    socket.on("new-order", (payload) => handleRefresh("new-order", payload));
    socket.on("order-updated", (payload) => handleRefresh("order-updated", payload));
    socket.on("order-closed", (payload) => handleRefresh("order-closed", payload));
    socket.on("table-updated", (payload) => handleRefresh("table-updated", payload));
    socket.on("call-bill", (payload) => handleRefresh("call-bill", payload));
    socket.on("call-staff", (payload) => handleRefresh("call-staff", payload));

    return () => {
      socket.disconnect();
    };
  }, [ristoranteAttivo]);

  function salvaOrdini(nuovi) {
    setOrdini(nuovi);
    localStorage.setItem(ordiniKey(ristoranteAttivo), JSON.stringify(nuovi));
  }

  function aggiornaExtra(tavolo, campo, valore) {
    setExtraInputs((prev) => ({
      ...prev,
      [tavolo]: {
        ...prev[tavolo],
        [campo]: valore,
      },
    }));
  }

  function aggiornaConto(tavolo, campo, valore) {
    setImpostazioniConto((prev) => ({
      ...prev,
      [tavolo]: {
        ...prev[tavolo],
        [campo]: valore,
      },
    }));
  }

  async function aggiungiPiatto(tavolo) {
    const valore = extraInputs[tavolo];
    if (!valore?.nome?.trim()) return;

    const nuovi = [...ordini];
    const ordine = nuovi.find((o) => String(o.tavolo) === String(tavolo));
    if (!ordine) return;

    const extraName = valore.nome.trim();
    const extraPrice = parseNumber(valore.prezzo);

    try {
      if (ordine.backendId) {
        const response = await fetch(`${API_URL}/orders/${ordine.backendId}/extra`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: extraName,
            price: extraPrice,
            quantity: 1,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || "Errore aggiunta extra");
        }
      }

      ordine.piatti.push({
        nome: extraName,
        prezzo: extraPrice,
        qty: 1,
        stato: "nuovo",
        servizio: "subito",
        categoria: "Extra",
      });

      ordine.time = Date.now();
      salvaOrdini(nuovi);

      setExtraInputs((prev) => ({
        ...prev,
        [tavolo]: { nome: "", prezzo: "" },
      }));

      await syncOrdini();
    } catch (err) {
      console.error(err);
      setErrore(err.message || "Impossibile aggiungere l’extra");
    }
  }

  function subtotaleOrdine(ordine) {
    return (ordine?.piatti || []).reduce((acc, p) => {
      return acc + parseNumber(p.prezzo) * parseNumber(p.qty || 0);
    }, 0);
  }

  function totalePezzi(ordine) {
    return (ordine?.piatti || []).reduce((acc, p) => acc + parseNumber(p.qty || 0), 0);
  }

  function totaleFinale(ordine) {
    if (!ordine) return 0;

    const cfg = impostazioniConto[ordine.tavolo] || {};
    const subtotale = subtotaleOrdine(ordine);
    const coperti = parseNumber(cfg.coperti);
    const costoCoperto = parseNumber(cfg.costoCoperto);
    const sconto = parseNumber(cfg.sconto);

    const totaleConCoperto = subtotale + coperti * costoCoperto;
    const totaleScontato = totaleConCoperto - (totaleConCoperto * sconto) / 100;

    return Math.max(0, Math.round(totaleScontato * 100) / 100);
  }

  async function chiudiConto(tavolo) {
    const ordiniCorrenti = JSON.parse(localStorage.getItem(ordiniKey(ristoranteAttivo)) || "[]");
    const storico = JSON.parse(localStorage.getItem(storicoKey(ristoranteAttivo)) || "[]");
    const ordine = ordiniCorrenti.find((o) => String(o.tavolo) === String(tavolo));

    if (!ordine) return;

    const cfg = impostazioniConto[tavolo] || {};
    const totale = totaleFinale(ordine);

    try {
      setClosing(true);
      setErrore("");

      if (ordine.backendId) {
        const response = await fetch(`${API_URL}/orders/${ordine.backendId}/close`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            discount: parseNumber(cfg.sconto),
            extra: parseNumber(cfg.coperti) * parseNumber(cfg.costoCoperto),
            paymentMethod: cfg.pagamento || null,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Errore chiusura conto sul backend");
        }
      }

      storico.push({
        ...ordine,
        totale,
        chiusoIl: Date.now(),
        pagamento: cfg.pagamento || "Non indicato",
        coperti: parseNumber(cfg.coperti),
        costoCoperto: parseNumber(cfg.costoCoperto),
        sconto: parseNumber(cfg.sconto),
      });

      const nuovi = ordiniCorrenti.filter((o) => String(o.tavolo) !== String(tavolo));

      localStorage.setItem(ordiniKey(ristoranteAttivo), JSON.stringify(nuovi));
      localStorage.setItem(storicoKey(ristoranteAttivo), JSON.stringify(storico));
      localStorage.removeItem(ordineConfermatoKey(ristoranteAttivo, tavolo));

      setOrdini(nuovi);
      setRichiesteConto((prev) => {
        const next = { ...prev };
        delete next[String(tavolo)];
        return next;
      });
      setRichiesteCameriere((prev) => {
        const next = { ...prev };
        delete next[String(tavolo)];
        return next;
      });
      setModalAperta(false);
      setTavoloSelezionato(null);

      await syncOrdini();
    } catch (err) {
      console.error("Errore backend chiusura:", err);
      setErrore(err.message || "Errore durante la chiusura conto");
    } finally {
      setClosing(false);
    }
  }

  function stampaPreconto(tavolo) {
    setTavoloStampa(tavolo);
    setTimeout(() => {
      window.print();
    }, 150);
  }

  const ordiniOrdinati = useMemo(() => {
    return [...ordini].sort((a, b) => Number(a.tavolo) - Number(b.tavolo));
  }, [ordini]);

  const ordineSelezionato = useMemo(() => {
    return ordiniOrdinati.find((o) => String(o.tavolo) === String(tavoloSelezionato)) || null;
  }, [ordiniOrdinati, tavoloSelezionato]);

  const incassoPotenziale = ordiniOrdinati.reduce((acc, o) => acc + totaleFinale(o), 0);
  const tavoliAperti = ordiniOrdinati.length;
  const contiRichiesti = ordiniOrdinati.filter((o) => o.billRequested || o.paymentStatus === "pending" || richiesteConto[o.tavolo]).length;
  const chiamateCameriere = Object.keys(richiesteCameriere).length;
  const piattiTotaliAperti = ordiniOrdinati.reduce((acc, ordine) => acc + totalePezzi(ordine), 0);

  function statoTavolo(numero) {
    const ordine = ordiniOrdinati.find((o) => String(o.tavolo) === String(numero));
    return getStatoOrdineCassa(ordine);
  }

  const gridHeight = "calc(100vh - 320px)";
  const righe = Math.max(1, Math.ceil(totaleTavoli / gridConfig.cols));
  const cardHeight = `calc((${gridHeight} - ${(righe - 1) * gridConfig.gap}px) / ${righe})`;

  const cfgSelezionato = tavoloSelezionato ? impostazioniConto[tavoloSelezionato] || {} : {};

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div className="em-v2-shell" style={{ paddingBottom: 0 }}>
        <CommandDock compact />
      </div>
      <div style={{ ...appShellStyle, paddingTop: 0 }}>
        <HighVolumeCashDesk
          loading={loading}
          error={errore}
          restaurantName={ristoranteAttivo}
          totalTables={totaleTavoli}
          orders={ordiniOrdinati}
          selectedTable={tavoloSelezionato}
          setSelectedTable={setTavoloSelezionato}
          selectedOrder={ordineSelezionato}
          setModalOpen={setModalAperta}
          lastEvent={ultimoEvento}
          counters={{
            revenue: incassoPotenziale,
            open: tavoliAperti,
            bills: contiRichiesti,
            staff: chiamateCameriere,
            items: piattiTotaliAperti,
          }}
          requestsBill={richiesteConto}
          requestsStaff={richiesteCameriere}
          tableState={statoTavolo}
          totalFinal={totaleFinale}
          totalPieces={totalePezzi}
          minutesFrom={differenzaMinuti}
          formatEuro={formatEuro}
          onRefresh={syncOrdini}
          onPrint={stampaPreconto}
          onCloseBill={chiudiConto}
          closing={closing}
        >
          {modalAperta && ordineSelezionato ? (
            <div className="hc-modal-content">
              <div className="hc-modal-header">
                <div>
                  <span>Dettaglio conto</span>
                  <h2>Tavolo {ordineSelezionato.tavolo}</h2>
                </div>
                <strong>{formatEuro(totaleFinale(ordineSelezionato))}</strong>
              </div>

              <div className={tavoloStampa === tavoloSelezionato ? "print-area hc-print-ticket" : "hc-print-ticket"}>
                <div className="hc-receipt-head">
                  <b>{ristoranteAttivo || "EasyMenu"}</b>
                  <span>{formatDateTime(Date.now())}</span>
                </div>
                <div className="hc-receipt-list">
                  {ordineSelezionato.piatti.map((p, index) => (
                    <div key={`${p.nome}-${index}`}>
                      <span>{p.qty}× {p.nome}</span>
                      <b>{formatEuro(parseNumber(p.prezzo) * parseNumber(p.qty))}</b>
                    </div>
                  ))}
                </div>
                <div className="hc-receipt-total">
                  <span>Totale</span>
                  <b>{formatEuro(totaleFinale(ordineSelezionato))}</b>
                </div>
              </div>

              <div className="hc-modal-grid">
                <section>
                  <h3>Conto</h3>
                  <label>Coperti<input type="number" min="0" value={cfgSelezionato.coperti || ""} onChange={(e) => aggiornaConto(tavoloSelezionato, "coperti", e.target.value)} style={inputStyle} /></label>
                  <label>Costo coperto<input type="number" min="0" step="0.01" value={cfgSelezionato.costoCoperto || ""} onChange={(e) => aggiornaConto(tavoloSelezionato, "costoCoperto", e.target.value)} style={inputStyle} /></label>
                  <label>Sconto %<input type="number" min="0" max="100" value={cfgSelezionato.sconto || ""} onChange={(e) => aggiornaConto(tavoloSelezionato, "sconto", e.target.value)} style={inputStyle} /></label>
                  <label>Pagamento
                    <select value={cfgSelezionato.pagamento || ""} onChange={(e) => aggiornaConto(tavoloSelezionato, "pagamento", e.target.value)} style={inputStyle}>
                      <option value="">Seleziona</option>
                      <option value="Contanti">Contanti</option>
                      <option value="Carta">Carta</option>
                      <option value="POS">POS</option>
                      <option value="Satispay">Satispay</option>
                      <option value="Altro">Altro</option>
                    </select>
                  </label>
                </section>

                <section>
                  <h3>Extra rapidi</h3>
                  <input type="text" placeholder="Nome extra" value={extraInputs[tavoloSelezionato]?.nome || ""} onChange={(e) => aggiornaExtra(tavoloSelezionato, "nome", e.target.value)} style={inputStyle} />
                  <input type="number" step="0.01" placeholder="Prezzo" value={extraInputs[tavoloSelezionato]?.prezzo || ""} onChange={(e) => aggiornaExtra(tavoloSelezionato, "prezzo", e.target.value)} style={inputStyle} />
                  <button className="hc-modal-secondary" onClick={() => aggiungiPiatto(tavoloSelezionato)}>Aggiungi extra</button>
                </section>

                <section>
                  <h3>Azioni</h3>
                  <button onClick={() => stampaPreconto(tavoloSelezionato)}>Stampa preconto</button>
                  <button className="success" onClick={() => chiudiConto(tavoloSelezionato)} disabled={closing}>{closing ? "Chiusura..." : "Chiudi tavolo"}</button>
                </section>
              </div>
            </div>
          ) : null}
        </HighVolumeCashDesk>
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
  outline: "none",
};

export default Cassa;