import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import OperationalFlowStrip from "../components/ops/OperationalFlowStrip";
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

  const gridHeight = "calc(100vh - 250px)";
  const righe = Math.max(1, Math.ceil(totaleTavoli / gridConfig.cols));
  const cardHeight = `calc((${gridHeight} - ${(righe - 1) * gridConfig.gap}px) / ${righe})`;

  const cfgSelezionato = tavoloSelezionato ? impostazioniConto[tavoloSelezionato] || {} : {};

  return (
    <div style={glowPageStyle}>
      <Navbar />

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          .print-area, .print-area * {
            visibility: visible !important;
          }

          .print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 24px !important;
          }
        }

        @keyframes pulseTableRealtime {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(59,130,246,0); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(59,130,246,0.14); }
          100% { transform: scale(1); box-shadow: 0 0 0 rgba(59,130,246,0); }
        }
      `}</style>

      <div style={appShellStyle}>
        <div className="app-shell">
          {ultimoEvento ? (
            <div className="em-live-ribbon">
              <b>Live</b>
              <span>
                {ultimoEvento.type === "new-order" && "Nuovo ordine ricevuto"}
                {ultimoEvento.type === "order-updated" && "Ordine aggiornato"}
                {ultimoEvento.type === "order-closed" && "Ordine chiuso"}
                {ultimoEvento.type === "table-updated" && "Tavolo aggiornato"}
                {ultimoEvento.type === "call-bill" && "Richiesta conto"}
                {ultimoEvento.type === "call-staff" && `Cameriere richiesto${ultimoEvento.payload?.reason ? `: ${ultimoEvento.payload.reason}` : ""}`}
              </span>
              <span>{formatDateTime(ultimoEvento.at)}</span>
            </div>
          ) : null}

          {errore ? (
            <div
              className="section-card"
              style={{
                marginBottom: 16,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
              }}
            >
              {errore}
            </div>
          ) : null}

          <OperationalFlowStrip
            title="Flusso cassa veloce"
            subtitle="Azioni ad alto impatto sempre visibili: meno click, meno errori, più tavoli chiusi."
            stats={[
              { label: "Da incassare", value: formatEuro(incassoPotenziale), tone: "green" },
              { label: "Conti", value: contiRichiesti, tone: contiRichiesti ? "amber" : "blue" },
              { label: "Chiamate", value: chiamateCameriere, tone: chiamateCameriere ? "red" : "blue" },
              { label: "Articoli", value: piattiTotaliAperti, tone: "dark" },
            ]}
            actions={[
              { label: "Aggiorna live", onClick: syncOrdini, primary: true },
              {
                label: tavoloSelezionato ? `Preconto T${tavoloSelezionato}` : "Preconto",
                onClick: () => tavoloSelezionato && stampaPreconto(tavoloSelezionato),
                disabled: !tavoloSelezionato,
              },
              {
                label: tavoloSelezionato ? `Chiudi T${tavoloSelezionato}` : "Chiudi conto",
                onClick: () => tavoloSelezionato && chiudiConto(tavoloSelezionato),
                disabled: !tavoloSelezionato || closing,
              },
            ]}
          />

          {loading ? (
            <div className="section-card">Caricamento cassa...</div>
          ) : (
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
                const ordine = ordiniOrdinati.find((o) => String(o.tavolo) === String(tavolo));
                const totale = ordine ? totaleFinale(ordine) : 0;
                const articoli = ordine ? totalePezzi(ordine) : 0;
                const minuti = ordine ? differenzaMinuti(ordine.time) : 0;
                const evidenziato = Boolean(tavoliInEvidenza[String(tavolo)]);
                const contoRichiesto = Boolean(
                  ordine?.billRequested ||
                    ordine?.paymentStatus === "pending" ||
                    richiesteConto[String(tavolo)]
                );
                const cameriereRichiesto = Boolean(richiesteCameriere[String(tavolo)]);

                return (
                  <button
                    key={tavolo}
                    onClick={() => {
                      setTavoloSelezionato(tavolo);
                      setModalAperta(true);
                    }}
                    className="section-card em-touch-card"
                    style={{
                      height: cardHeight,
                      minHeight: 72,
                      border: contoRichiesto || cameriereRichiesto
                        ? "3px solid rgba(255,255,255,0.95)"
                        : evidenziato
                          ? "2px solid rgba(255,255,255,0.8)"
                          : "none",
                      background: cameriereRichiesto
                        ? "linear-gradient(135deg, #f97316 0%, #c2410c 100%)"
                        : contoRichiesto
                        ? "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)"
                        : stato.bg,
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      transition: "transform 0.18s ease, box-shadow 0.18s ease",
                      padding: 12,
                      overflow: "hidden",
                      animation: evidenziato ? "pulseTableRealtime 1.2s ease-in-out infinite" : "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 14px 22px rgba(15,23,42,0.18)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "";
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 900 }}>T{tavolo}</div>

                    {cameriereRichiesto ? (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.24)",
                          padding: "5px 9px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        Cameriere
                      </div>
                    ) : contoRichiesto ? (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.24)",
                          padding: "5px 9px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        Conto
                      </div>
                    ) : null}

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        textAlign: "center",
                        lineHeight: 1.15,
                      }}
                    >
                      {stato.label}
                    </div>

                    <div
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {ordine ? `${articoli} articoli` : "Libero"}
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 900 }}>
                      {ordine ? formatEuro(totale) : "—"}
                    </div>

                    <div style={{ fontSize: 11, opacity: 0.92 }}>
                      {ordine ? `${minuti} min fa` : "Nessun ordine"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {modalAperta && (
            <Modal
              onClose={() => {
                setModalAperta(false);
                setTavoloSelezionato(null);
                setTavoloStampa(null);
              }}
              maxWidth={1100}
            >
              <div style={{ paddingTop: 10 }}>
                <h2 style={{ marginTop: 0, marginBottom: 10 }}>
                  Tavolo {tavoloSelezionato}
                </h2>

                {!ordineSelezionato ? (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 18,
                      padding: 18,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 18 }}>Tavolo libero</div>
                    <div style={{ marginTop: 6, color: "#475569" }}>
                      Nessun ordine attivo su questo tavolo.
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.15fr 0.85fr",
                      gap: 18,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 20,
                        padding: 18,
                        boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 22 }}>
                            Ordine tavolo {ordineSelezionato.tavolo}
                          </div>
                          <div style={{ color: "#6b7280", marginTop: 4 }}>
                            Aperto il {formatDateTime(ordineSelezionato.time)}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontWeight: 800,
                          }}
                        >
                          {differenzaMinuti(ordineSelezionato.time)} min
                        </div>
                      </div>

                      {(ordineSelezionato.billRequested ||
                        ordineSelezionato.paymentStatus === "pending" ||
                        richiesteConto[String(tavoloSelezionato)]) ? (
                        <div
                          style={{
                            marginBottom: 14,
                            background: "#f5f3ff",
                            border: "1px solid #c4b5fd",
                            color: "#4c1d95",
                            borderRadius: 16,
                            padding: 14,
                            fontWeight: 800,
                          }}
                        >
                          🔔 Il cliente ha richiesto il conto. Controlla il preconto e chiudi con il metodo di pagamento corretto.
                        </div>
                      ) : null}

                      {richiesteCameriere[String(tavoloSelezionato)] ? (
                        <div
                          style={{
                            marginBottom: 14,
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            color: "#9a3412",
                            borderRadius: 16,
                            padding: 14,
                            fontWeight: 800,
                          }}
                        >
                          🛎️ Il cliente ha chiamato il cameriere: {richiesteCameriere[String(tavoloSelezionato)]?.reason || "assistenza"}.
                        </div>
                      ) : null}

                      <div
                        className={tavoloStampa === tavoloSelezionato ? "print-area" : ""}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e5e7eb",
                          borderRadius: 16,
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                            marginBottom: 14,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 18 }}>
                              Preconto tavolo {ordineSelezionato.tavolo}
                            </div>
                            <div style={{ color: "#6b7280", marginTop: 4 }}>
                              {ristoranteAttivo}
                            </div>
                          </div>

                          <div style={{ color: "#6b7280", fontSize: 14 }}>
                            {formatDateTime(Date.now())}
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 10 }}>
                          {ordineSelezionato.piatti.map((p, index) => (
                            <div
                              key={`${p.nome}-${p.servizio}-${p.categoria}-${index}`}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                background: "white",
                                border: "1px solid #e5e7eb",
                                borderRadius: 14,
                                padding: 12,
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 800 }}>
                                  {p.nome} x{p.qty}
                                </div>

                                <div
                                  style={{
                                    marginTop: 6,
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: 999,
                                      background: "#f3f4f6",
                                      fontSize: 12,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {p.categoria || "Senza categoria"}
                                  </span>

                                  <span
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: 999,
                                      background: p.servizio === "dopo" ? "#ede9fe" : "#dbeafe",
                                      color: p.servizio === "dopo" ? "#6d28d9" : "#1d4ed8",
                                      fontSize: 12,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {p.servizio === "dopo" ? "Porta dopo" : "Porta subito"}
                                  </span>

                                  <span
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: 999,
                                      background:
                                        p.stato === "pronto"
                                          ? "#dcfce7"
                                          : p.stato === "preparazione"
                                          ? "#fef3c7"
                                          : "#dbeafe",
                                      color:
                                        p.stato === "pronto"
                                          ? "#166534"
                                          : p.stato === "preparazione"
                                          ? "#92400e"
                                          : "#1d4ed8",
                                      fontSize: 12,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {p.stato || "nuovo"}
                                  </span>
                                </div>
                              </div>

                              <div style={{ fontWeight: 900 }}>
                                {formatEuro(parseNumber(p.prezzo) * parseNumber(p.qty))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {ordineSelezionato.nota ? (
                          <div
                            style={{
                              marginTop: 14,
                              background: "#fff7ed",
                              border: "1px solid #fed7aa",
                              borderRadius: 14,
                              padding: 12,
                            }}
                          >
                            <b>Nota:</b> {ordineSelezionato.nota}
                          </div>
                        ) : null}

                        <div
                          style={{
                            marginTop: 16,
                            borderTop: "1px dashed #cbd5e1",
                            paddingTop: 14,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <span>Subtotale</span>
                            <b>{formatEuro(subtototaleOrdineSafe(ordineSelezionato))}</b>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <span>
                              Coperti ({parseNumber(cfgSelezionato.coperti)} ×{" "}
                              {formatEuro(parseNumber(cfgSelezionato.costoCoperto))})
                            </span>
                            <b>
                              {formatEuro(
                                parseNumber(cfgSelezionato.coperti) *
                                  parseNumber(cfgSelezionato.costoCoperto)
                              )}
                            </b>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <span>Sconto</span>
                            <b>{parseNumber(cfgSelezionato.sconto)}%</b>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              fontSize: 20,
                              fontWeight: 900,
                            }}
                          >
                            <span>Totale</span>
                            <span>{formatEuro(totaleFinale(ordineSelezionato))}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 20,
                          padding: 18,
                          boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
                        }}
                      >
                        <h3 style={{ marginTop: 0 }}>Impostazioni conto</h3>

                        <div style={{ display: "grid", gap: 12 }}>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontWeight: 700 }}>Numero coperti</span>
                            <input
                              type="number"
                              min="0"
                              value={cfgSelezionato.coperti || ""}
                              onChange={(e) =>
                                aggiornaConto(tavoloSelezionato, "coperti", e.target.value)
                              }
                              style={inputStyle}
                            />
                          </label>

                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontWeight: 700 }}>Costo coperto</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={cfgSelezionato.costoCoperto || ""}
                              onChange={(e) =>
                                aggiornaConto(tavoloSelezionato, "costoCoperto", e.target.value)
                              }
                              style={inputStyle}
                            />
                          </label>

                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontWeight: 700 }}>Sconto %</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={cfgSelezionato.sconto || ""}
                              onChange={(e) =>
                                aggiornaConto(tavoloSelezionato, "sconto", e.target.value)
                              }
                              style={inputStyle}
                            />
                          </label>

                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontWeight: 700 }}>Metodo pagamento</span>
                            <select
                              value={cfgSelezionato.pagamento || ""}
                              onChange={(e) =>
                                aggiornaConto(tavoloSelezionato, "pagamento", e.target.value)
                              }
                              style={inputStyle}
                            >
                              <option value="">Seleziona</option>
                              <option value="Contanti">Contanti</option>
                              <option value="Carta">Carta</option>
                              <option value="POS">POS</option>
                              <option value="Satispay">Satispay</option>
                              <option value="Altro">Altro</option>
                            </select>
                          </label>
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 20,
                          padding: 18,
                          boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
                        }}
                      >
                        <h3 style={{ marginTop: 0 }}>Aggiungi extra</h3>

                        <div style={{ display: "grid", gap: 10 }}>
                          <input
                            type="text"
                            placeholder="Nome extra"
                            value={extraInputs[tavoloSelezionato]?.nome || ""}
                            onChange={(e) =>
                              aggiornaExtra(tavoloSelezionato, "nome", e.target.value)
                            }
                            style={inputStyle}
                          />

                          <input
                            type="number"
                            step="0.01"
                            placeholder="Prezzo"
                            value={extraInputs[tavoloSelezionato]?.prezzo || ""}
                            onChange={(e) =>
                              aggiornaExtra(tavoloSelezionato, "prezzo", e.target.value)
                            }
                            style={inputStyle}
                          />

                          <button
                            onClick={() => aggiungiPiatto(tavoloSelezionato)}
                            style={{
                              border: "none",
                              borderRadius: 14,
                              padding: "13px 16px",
                              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                              color: "white",
                              fontWeight: 800,
                              cursor: "pointer",
                              boxShadow: "0 12px 22px rgba(37,99,235,0.22)",
                            }}
                          >
                            Aggiungi extra al tavolo
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 20,
                          padding: 18,
                          boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
                        }}
                      >
                        <h3 style={{ marginTop: 0 }}>Azioni</h3>

                        <div style={{ display: "grid", gap: 10 }}>
                          <button
                            onClick={() => stampaPreconto(tavoloSelezionato)}
                            style={{
                              border: "none",
                              borderRadius: 14,
                              padding: "13px 16px",
                              background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
                              color: "white",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            Stampa preconto
                          </button>

                          <button
                            onClick={() => chiudiConto(tavoloSelezionato)}
                            disabled={closing}
                            style={{
                              border: "none",
                              borderRadius: 14,
                              padding: "13px 16px",
                              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                              color: "white",
                              fontWeight: 800,
                              cursor: closing ? "not-allowed" : "pointer",
                              boxShadow: "0 12px 22px rgba(22,163,74,0.22)",
                              opacity: closing ? 0.75 : 1,
                            }}
                          >
                            {closing ? "Chiusura conto..." : "Chiudi conto"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
  outline: "none",
};

export default Cassa;