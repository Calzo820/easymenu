import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import { glowPageStyle } from "../styles/pageStyles";
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
  const amount = Number(value || 0);
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number.isFinite(amount) ? amount : 0);
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateTime(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("it-IT");
}

function getGridConfig(total) {
  if (total <= 8) return { cols: 4, gap: 12 };
  if (total <= 20) return { cols: 5, gap: 10 };
  if (total <= 36) return { cols: 6, gap: 9 };
  if (total <= 64) return { cols: 8, gap: 8 };
  if (total <= 100) return { cols: 10, gap: 6 };
  if (total <= 144) return { cols: 12, gap: 5 };
  return { cols: 14, gap: 4 };
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

function getTableTileKind({ ordine, contoRichiesto, cameriereRichiesto }) {
  if (cameriereRichiesto) return "staff";
  if (contoRichiesto) return "bill";
  if (!ordine) return "free";
  if (ordine.status === "ready" || ordine.stato === "ready") return "ready";
  if (ordine.status === "in_progress" || ordine.stato === "in_progress") return "progress";
  return "open";
}

function mapBackendItemStatus(status) {
  const normalized = String(status || "").toLowerCase().trim();
  if (normalized === "voided") return "annullato";
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
    backendStatus: item.status || "active",
    isComplimentary: Boolean(item.isComplimentary),
    voidReason: item.voidReason || "",
    complimentaryReason: item.complimentaryReason || "",
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
    payments: Array.isArray(order.payments) ? order.payments : [],
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
  const [itemAction, setItemAction] = useState(null);
  const [cashPanelOpen, setCashPanelOpen] = useState(false);
  const [cashSummary, setCashSummary] = useState(null);
  const [cashLoading, setCashLoading] = useState(false);
  const [declaredCash, setDeclaredCash] = useState("");
  const [closureNotes, setClosureNotes] = useState("");
  const [orderAudit, setOrderAudit] = useState([]);

  const socketRef = useRef(null);
  const bellRef = useRef(null);

  const ristoranteAttivo = getRistoranteAttivo();
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("auth_user") || "null") || {};
    } catch {
      return {};
    }
  });
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
    timer = setInterval(syncOrdini, 20000);

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
      if (import.meta.env.DEV) console.info("Socket cassa connesso:", socket.id);
    });

    socket.on("disconnect", () => {
      if (import.meta.env.DEV) console.info("Socket cassa disconnesso");
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
            preparationArea: valore.preparationArea || "kitchen",
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
        [tavolo]: { nome: "", prezzo: "", preparationArea: "kitchen" },
      }));

      await syncOrdini();
    } catch (err) {
      console.error(err);
      setErrore(err.message || "Impossibile aggiungere extra");
    }
  }

  function subtotaleOrdine(ordine) {
    return (ordine?.piatti || []).reduce((acc, p) => {
      if (p.backendStatus === "voided" || p.isComplimentary) return acc;
      return acc + parseNumber(p.prezzo) * parseNumber(p.qty || 0);
    }, 0);
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

  function quotaPerPersona(ordine) {
    if (!ordine) return 0;
    const cfg = impostazioniConto[ordine.tavolo] || {};
    const persone = parseNumber(cfg.dividiConto);
    if (persone <= 1) return 0;
    return Math.round((totaleFinale(ordine) / persone) * 100) / 100;
  }

  function restanteDaIncassare(ordine) {
    if (!ordine) return 0;
    const paid = (ordine.payments || [])
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + parseNumber(payment.amount), 0);
    return Math.max(0, Math.round((totaleFinale(ordine) - paid) * 100) / 100);
  }

  function updateMixedPayment(tavolo, method, value) {
    setImpostazioniConto((prev) => ({
      ...prev,
      [tavolo]: {
        ...(prev[tavolo] || {}),
        pagamentiMisti: {
          ...(prev[tavolo]?.pagamentiMisti || {}),
          [method]: value,
        },
      },
    }));
  }

  function paymentRowsForTable(tavolo) {
    const cfg = impostazioniConto[tavolo] || {};
    if (!cfg.pagamentoMisto) return [];
    return Object.entries(cfg.pagamentiMisti || {})
      .map(([method, amount]) => ({ method, amount: parseNumber(amount), label: method }))
      .filter((row) => row.amount > 0);
  }

  async function registraAcconto(ordine) {
    const cfg = impostazioniConto[ordine.tavolo] || {};
    const amount = parseNumber(cfg.acconto);
    if (!cfg.pagamento || amount <= 0) {
      setErrore("Scegli il metodo e inserisci l'importo dell'acconto.");
      return;
    }
    try {
      setClosing(true);
      setErrore("");
      const response = await fetch(`${API_URL}/orders/${ordine.backendId}/payments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ method: cfg.pagamento, amount, label: "Acconto" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Acconto non registrato");
      aggiornaConto(ordine.tavolo, "acconto", "");
      await syncOrdini();
    } catch (err) {
      setErrore(err.message || "Impossibile registrare l'acconto");
    } finally {
      setClosing(false);
    }
  }

  async function applicaAzioneArticolo() {
    if (!itemAction?.orderId || !itemAction?.itemId) return;
    if (itemAction.action !== "restore" && !String(itemAction.reason || "").trim()) {
      setErrore("Indica il motivo dell'operazione.");
      return;
    }
    try {
      setClosing(true);
      setErrore("");
      const response = await fetch(`${API_URL}/orders/${itemAction.orderId}/items/${itemAction.itemId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: itemAction.action, reason: itemAction.reason }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Articolo non aggiornato");
      setItemAction(null);
      await syncOrdini();
    } catch (err) {
      setErrore(err.message || "Impossibile aggiornare l'articolo");
    } finally {
      setClosing(false);
    }
  }

  async function loadCashSummary() {
    try {
      setCashLoading(true);
      setErrore("");
      const now = new Date();
      const date = localDateKey(now);
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      const response = await fetch(
        `${API_URL}/cash/summary?date=${date}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Riepilogo cassa non disponibile");
      setCashSummary(data);
      setDeclaredCash(data?.closure?.declaredCash ?? data?.expectedCash ?? "");
    } catch (err) {
      setErrore(err.message || "Riepilogo cassa non disponibile");
    } finally {
      setCashLoading(false);
    }
  }

  async function openCashPanel() {
    setCashPanelOpen(true);
    await loadCashSummary();
  }

  async function chiudiGiornata() {
    try {
      setCashLoading(true);
      setErrore("");
      const now = new Date();
      const date = localDateKey(now);
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      const response = await fetch(`${API_URL}/cash/closures`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date,
          from: from.toISOString(),
          to: to.toISOString(),
          declaredCash: parseNumber(declaredCash),
          notes: closureNotes,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Chiusura non completata");
      setCashSummary({ ...data.summary, closure: data.closure });
    } catch (err) {
      setErrore(err.message || "Chiusura giornaliera non completata");
    } finally {
      setCashLoading(false);
    }
  }

  async function riapriConto(orderId) {
    const reason = window.prompt("Motivo della riapertura del conto:");
    if (!reason) return;
    try {
      setCashLoading(true);
      const response = await fetch(`${API_URL}/orders/${orderId}/reopen`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Conto non riaperto");
      await Promise.all([syncOrdini(), loadCashSummary()]);
    } catch (err) {
      setErrore(err.message || "Conto non riaperto");
    } finally {
      setCashLoading(false);
    }
  }

  function esportaChiusuraCsv() {
    if (!cashSummary) return;
    const rows = [
      ["Data", cashSummary.date],
      ["Incasso totale", cashSummary.grossTotal],
      ["Contanti attesi", cashSummary.expectedCash],
      ["Contanti dichiarati", declaredCash],
      ["Differenza", parseNumber(declaredCash) - parseNumber(cashSummary.expectedCash)],
      ["Carta", cashSummary.totals?.card || 0],
      ["Online", cashSummary.totals?.online || 0],
      ["Satispay", cashSummary.totals?.satispay || 0],
      ["Altri metodi", cashSummary.totals?.other || 0],
      ["Conti chiusi", cashSummary.orderCount || 0],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `chiusura-cassa-${cashSummary.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
        const mixedPayments = paymentRowsForTable(tavolo);
        if (cfg.pagamentoMisto && !mixedPayments.length) {
          throw new Error("Inserisci almeno una quota per il pagamento misto.");
        }
        if (!cfg.pagamentoMisto && !cfg.pagamento) {
          throw new Error("Scegli il metodo di pagamento.");
        }
        const response = await fetch(`${API_URL}/orders/${ordine.backendId}/close`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            discount: (
              (subtotaleOrdine(ordine) + parseNumber(cfg.coperti) * parseNumber(cfg.costoCoperto)) *
              parseNumber(cfg.sconto)
            ) / 100,
            extra: parseNumber(cfg.coperti) * parseNumber(cfg.costoCoperto),
            paymentMethod: cfg.pagamentoMisto ? null : cfg.pagamento || null,
            payments: cfg.pagamentoMisto ? mixedPayments : undefined,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          if (data?.order) await syncOrdini();
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
        dividiConto: parseNumber(cfg.dividiConto),
        acconto: parseNumber(cfg.acconto),
        restante: restanteDaIncassare(ordine),
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

  useEffect(() => {
    let active = true;
    async function loadAudit() {
      if (!ordineSelezionato?.backendId) {
        setOrderAudit([]);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/orders/${ordineSelezionato.backendId}/audit`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json().catch(() => []);
        if (active) setOrderAudit(response.ok && Array.isArray(data) ? data : []);
      } catch {
        if (active) setOrderAudit([]);
      }
    }
    loadAudit();
    return () => { active = false; };
  }, [ordineSelezionato?.backendId]);

  const incassoPotenziale = ordiniOrdinati.reduce((acc, o) => acc + totaleFinale(o), 0);
  const tavoliAperti = ordiniOrdinati.length;
  const contiRichiesti = ordiniOrdinati.filter((o) => o.billRequested || o.paymentStatus === "pending" || richiesteConto[o.tavolo]).length;

  function statoTavolo(numero) {
    const ordine = ordiniOrdinati.find((o) => String(o.tavolo) === String(numero));
    return getStatoOrdineCassa(ordine);
  }

  const cfgSelezionato = tavoloSelezionato ? impostazioniConto[tavoloSelezionato] || {} : {};

  const tableTiles = Array.from({ length: totaleTavoli }, (_, i) => i + 1);
  const selectedHasOrder = Boolean(ordineSelezionato);
  const selectedTileKind = ordineSelezionato
    ? getTableTileKind({
      ordine: ordineSelezionato,
      contoRichiesto: Boolean(
        ordineSelezionato.billRequested ||
        ordineSelezionato.paymentStatus === "pending" ||
        richiesteConto[String(tavoloSelezionato)]
      ),
      cameriereRichiesto: Boolean(richiesteCameriere[String(tavoloSelezionato)]),
    })
    : "free";

  return (
    <div style={glowPageStyle}>
      <Navbar />

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute !important; inset: 0 !important; width: 100% !important; background: white !important; color: black !important; padding: 24px !important; }
        }
        @keyframes pulseTableRealtime {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(59,130,246,0); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(59,130,246,0.14); }
          100% { transform: scale(1); box-shadow: 0 0 0 rgba(59,130,246,0); }
        }
      `}</style>

      <div className="operator-workspace cashdesk-workspace">
        <section className="pos-topbar">
          <div>
            <span>Cassa live</span>
            <strong>Servizio in corso</strong>
          </div>
          <div className="pos-topbar__stats">
            <span><b>{tavoliAperti}</b><small>tavoli aperti</small></span>
            <span className={contiRichiesti ? "is-alert" : ""}><b>{contiRichiesti}</b><small>conti richiesti</small></span>
            <span><b>{formatEuro(incassoPotenziale)}</b><small>da incassare</small></span>
          </div>
          <div className="pos-topbar__actions">
            <button type="button" onClick={syncOrdini}>Aggiorna</button>
            <button type="button" className="is-secondary" onClick={openCashPanel}>Chiusura giornata</button>
          </div>
        </section>

        {ultimoEvento ? (
          <div className="pos-live-strip">
            Live: {ultimoEvento.type === "new-order" && "Nuovo ordine"}{ultimoEvento.type === "order-updated" && "Ordine aggiornato"}{ultimoEvento.type === "order-closed" && "Ordine chiuso"}{ultimoEvento.type === "table-updated" && "Tavolo aggiornato"}{ultimoEvento.type === "call-bill" && "Richiesta conto"}{ultimoEvento.type === "call-staff" && "Cameriere richiesto"}
          </div>
        ) : null}

        {errore ? <div className="pos-error">{errore}</div> : null}

        {cashPanelOpen ? (
          <section className="cash-close-panel">
            <div className="cash-close-panel__head">
              <div>
                <span>Chiusura giornaliera</span>
                <strong>{cashSummary?.date ? new Date(`${cashSummary.date}T12:00:00`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : "Oggi"}</strong>
              </div>
              <button type="button" aria-label="Chiudi pannello" onClick={() => setCashPanelOpen(false)}>×</button>
            </div>
            {cashLoading && !cashSummary ? <div className="pos-empty">Calcolo dei pagamenti registrati...</div> : null}
            {cashSummary ? (
              <>
                <div className="cash-close-kpis">
                  <div><span>Incasso</span><b>{formatEuro(cashSummary.grossTotal)}</b><small>{cashSummary.orderCount} conti</small></div>
                  <div><span>Contanti attesi</span><b>{formatEuro(cashSummary.expectedCash)}</b><small>Da pagamenti registrati</small></div>
                  <div><span>Carta e online</span><b>{formatEuro(parseNumber(cashSummary.totals?.card) + parseNumber(cashSummary.totals?.online))}</b><small>Riconciliati</small></div>
                  <div><span>Controlli</span><b>{parseNumber(cashSummary.voidedItems) + parseNumber(cashSummary.complimentaryItems)}</b><small>Annulli e omaggi</small></div>
                </div>
                {cashSummary.openOrders?.length ? (
                  <div className="cash-close-warning">{cashSummary.openOrders.length} conti sono ancora aperti: chiudili prima della giornata.</div>
                ) : null}
                <div className="cash-close-form">
                  <label>
                    Contanti nel cassetto
                    <input type="number" step="0.01" min="0" value={declaredCash} onChange={(event) => setDeclaredCash(event.target.value)} />
                  </label>
                  <div className={`cash-difference ${parseNumber(declaredCash) - parseNumber(cashSummary.expectedCash) === 0 ? "is-ok" : "is-alert"}`}>
                    <span>Differenza</span>
                    <b>{formatEuro(parseNumber(declaredCash) - parseNumber(cashSummary.expectedCash))}</b>
                  </div>
                  <label className="is-wide">
                    Note turno
                    <input value={closureNotes} onChange={(event) => setClosureNotes(event.target.value)} placeholder="Facoltative" />
                  </label>
                </div>
                <div className="cash-close-actions">
                  <button type="button" onClick={esportaChiusuraCsv}>Esporta CSV</button>
                  <button type="button" className="is-primary" disabled={cashLoading || cashSummary.openOrders?.length > 0} onClick={chiudiGiornata}>
                    {cashSummary.closure?.status === "closed" ? "Aggiorna chiusura" : "Chiudi giornata"}
                  </button>
                </div>
                {cashSummary.closure?.status === "closed" ? (
                  <div className="cash-closed-note">Giornata chiusa da {cashSummary.closure.closedBy?.name || "operatore"}.</div>
                ) : null}
                {cashSummary.recentOrders?.length ? (
                  <details className="cash-recent-orders">
                    <summary>Ultimi conti chiusi ({cashSummary.recentOrders.length})</summary>
                    <div>
                      {cashSummary.recentOrders.slice(0, 12).map((order) => (
                        <p key={order.id}>
                          <span><b>{order.table}</b><small>{formatDateTime(order.closedAt)}</small></span>
                          <strong>{formatEuro(order.totalAmount)}</strong>
                          {currentUser.role === "owner" ? <button type="button" onClick={() => riapriConto(order.id)}>Riapri</button> : null}
                        </p>
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        <section className="pos-layout">
          <div className="pos-table-map">
            <div className="pos-map-head">
               <div>
                 <strong>Tavoli</strong>
                 <span>{totaleTavoli} tavoli · seleziona un tavolo per aprire il conto</span>
               </div>
               <div className="pos-legend">
                 <span><i className="free" />Libero</span>
                 <span><i className="open" />Ordine</span>
                 <span><i className="progress" />Preparazione</span>
                 <span><i className="ready" />Pronto</span>
                 <span><i className="bill" />Conto</span>
                 <span><i className="staff" />Assistenza</span>
              </div>
            </div>

            {loading ? <div className="pos-empty">Caricamento cassa...</div> : null}

            {!loading ? (
              <div
                className="em-table-grid em-table-grid--cash"
                style={{
                  gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                  gap: gridConfig.gap,
                  minHeight: 0,
                }}
              >
                {tableTiles.map((tavolo) => {
                  const stato = statoTavolo(tavolo);
                  const ordine = ordiniOrdinati.find((o) => String(o.tavolo) === String(tavolo));
                  const totale = ordine ? totaleFinale(ordine) : 0;
                  const evidenziato = Boolean(tavoliInEvidenza[String(tavolo)]);
                  const contoRichiesto = Boolean(ordine?.billRequested || ordine?.paymentStatus === "pending" || richiesteConto[String(tavolo)]);
                  const cameriereRichiesto = Boolean(richiesteCameriere[String(tavolo)]);
                  const tileKind = getTableTileKind({ ordine, contoRichiesto, cameriereRichiesto });
                  const selected = String(tavoloSelezionato) === String(tavolo);

                  return (
                    <button
                      key={tavolo}
                      type="button"
                      onClick={() => setTavoloSelezionato(tavolo)}
                       className={`cash-table-card cash-table-card--${tileKind} ${evidenziato ? "is-live" : ""} ${selected ? "is-selected" : ""}`}
                       style={{ animation: evidenziato ? "pulseTableRealtime 1.2s ease-in-out infinite" : "none" }}
                       aria-label={`Tavolo ${tavolo}, ${stato.label}${ordine ? `, ${formatEuro(totale)}` : ""}`}
                     >
                       <div className="cash-table-card__number">T{tavolo}</div>
                      <div className="cash-table-card__state">{stato.label}</div>
                      <div className="cash-table-card__total">{ordine ? formatEuro(totale) : "-"}</div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <aside className="pos-drawer">
            <div className="pos-drawer__head">
              <div>
                <span>Tavolo selezionato</span>
                <strong>{tavoloSelezionato ? `Tavolo ${tavoloSelezionato}` : "Nessun tavolo"}</strong>
              </div>
              {tavoloSelezionato ? <button type="button" aria-label="Chiudi dettaglio tavolo" onClick={() => setTavoloSelezionato(null)}>×</button> : null}
            </div>

            {!tavoloSelezionato ? (
              <div className="pos-empty">Seleziona un tavolo dalla mappa per aprire ordine, preconto e pagamento.</div>
            ) : null}

            {tavoloSelezionato && !selectedHasOrder ? (
              <div className="pos-empty pos-empty--success">Tavolo libero. Nessun conto da chiudere.</div>
            ) : null}

            {ordineSelezionato ? (
              <div className="pos-bill">
                <div className={`pos-order-status is-${selectedTileKind}`}>
                  <span>Stato tavolo</span>
                  <b>{getStatoOrdineCassa(ordineSelezionato).label}</b>
                </div>
                <div className="pos-total-card">
                  <span>Totale</span>
                  <strong>{formatEuro(totaleFinale(ordineSelezionato))}</strong>
                  <small>Aperto {formatDateTime(ordineSelezionato.time)}</small>
                </div>

                {(ordineSelezionato.billRequested || ordineSelezionato.paymentStatus === "pending" || richiesteConto[String(tavoloSelezionato)]) ? (
                  <div className="pos-callout">Conto richiesto dal cliente</div>
                ) : null}

                <div className="pos-items-list">
                  {(ordineSelezionato.piatti || []).map((p, index) => (
                    <div className={`is-${String(p.stato || "nuovo").toLowerCase()} ${p.isComplimentary ? "is-complimentary" : ""}`} key={`${p.id || p.nome}-${index}`}>
                      <b>
                        {parseNumber(p.qty || 1)}x {p.nome}
                        {p.backendStatus === "voided" ? <small>Annullato: {p.voidReason}</small> : null}
                        {p.isComplimentary ? <small>Omaggio: {p.complimentaryReason}</small> : null}
                      </b>
                      <span>{p.backendStatus === "voided" || p.isComplimentary ? formatEuro(0) : formatEuro(parseNumber(p.prezzo) * parseNumber(p.qty || 1))}</span>
                      {p.id ? (
                        <button
                          type="button"
                          className="pos-item-menu"
                          aria-label={`Azioni per ${p.nome}`}
                          onClick={() => setItemAction({
                            orderId: ordineSelezionato.backendId,
                            itemId: p.id,
                            itemName: p.nome,
                            action: p.backendStatus === "voided" || p.isComplimentary ? "restore" : "void",
                            reason: "",
                          })}
                        >•••</button>
                      ) : null}
                    </div>
                  ))}
                </div>

                {itemAction?.orderId === ordineSelezionato.backendId ? (
                  <div className="pos-item-action-panel">
                    <div><span>Modifica articolo</span><b>{itemAction.itemName}</b></div>
                    {itemAction.action !== "restore" ? (
                      <input placeholder="Motivo obbligatorio" value={itemAction.reason} onChange={(event) => setItemAction((prev) => ({ ...prev, reason: event.target.value }))} />
                    ) : null}
                    <div className="pos-item-action-choice">
                      <button type="button" className={itemAction.action === "void" ? "is-active" : ""} onClick={() => setItemAction((prev) => ({ ...prev, action: "void" }))}>Annulla</button>
                      <button type="button" className={itemAction.action === "complimentary" ? "is-active" : ""} onClick={() => setItemAction((prev) => ({ ...prev, action: "complimentary" }))}>Omaggio</button>
                      {(ordineSelezionato.piatti || []).find((item) => item.id === itemAction.itemId)?.backendStatus === "voided" || (ordineSelezionato.piatti || []).find((item) => item.id === itemAction.itemId)?.isComplimentary ? (
                        <button type="button" className={itemAction.action === "restore" ? "is-active" : ""} onClick={() => setItemAction((prev) => ({ ...prev, action: "restore" }))}>Ripristina</button>
                      ) : null}
                    </div>
                    <div className="pos-item-action-buttons">
                      <button type="button" onClick={() => setItemAction(null)}>Chiudi</button>
                      <button type="button" className="is-primary" disabled={closing} onClick={applicaAzioneArticolo}>Conferma</button>
                    </div>
                  </div>
                ) : null}

                <label className="pos-mixed-toggle">
                  <input type="checkbox" checked={Boolean(cfgSelezionato.pagamentoMisto)} onChange={(event) => aggiornaConto(tavoloSelezionato, "pagamentoMisto", event.target.checked)} />
                  <span><b>Pagamento misto</b><small>Dividi l'importo tra più metodi.</small></span>
                </label>
                {!cfgSelezionato.pagamentoMisto ? (
                  <div className="pos-payment-grid">
                    {["Carta", "Contanti", "Satispay", "Altro"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={cfgSelezionato.pagamento === method ? "is-active" : ""}
                        onClick={() => aggiornaConto(tavoloSelezionato, "pagamento", method)}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="pos-mixed-grid">
                    {["Carta", "Contanti", "Satispay", "Altro"].map((method) => (
                      <label key={method}>{method}<input type="number" min="0" step="0.01" placeholder="0,00" value={cfgSelezionato.pagamentiMisti?.[method] || ""} onChange={(event) => updateMixedPayment(tavoloSelezionato, method, event.target.value)} /></label>
                    ))}
                  </div>
                )}
                {(ordineSelezionato.payments || []).some((payment) => payment.status === "paid") ? (
                  <div className="pos-paid-progress"><span>Già pagato</span><b>{formatEuro(totaleFinale(ordineSelezionato) - restanteDaIncassare(ordineSelezionato))}</b><small>Restano {formatEuro(restanteDaIncassare(ordineSelezionato))}</small></div>
                ) : null}

                <details className="pos-advanced">
                  <summary>Extra, sconto e divisione conto</summary>
                  <div className="pos-form-grid">
                    <input style={inputStyle} placeholder="Coperti" inputMode="numeric" value={cfgSelezionato.coperti || ""} onChange={(event) => aggiornaConto(tavoloSelezionato, "coperti", event.target.value)} />
                    <input style={inputStyle} placeholder="Costo coperto" inputMode="decimal" value={cfgSelezionato.costoCoperto || ""} onChange={(event) => aggiornaConto(tavoloSelezionato, "costoCoperto", event.target.value)} />
                    <input style={inputStyle} placeholder="Sconto %" inputMode="decimal" value={cfgSelezionato.sconto || ""} onChange={(event) => aggiornaConto(tavoloSelezionato, "sconto", event.target.value)} />
                    <input style={inputStyle} placeholder="Dividi per" inputMode="numeric" value={cfgSelezionato.dividiConto || ""} onChange={(event) => aggiornaConto(tavoloSelezionato, "dividiConto", event.target.value)} />
                    <div className="pos-deposit-field">
                      <input style={inputStyle} placeholder="Acconto" inputMode="decimal" value={cfgSelezionato.acconto || ""} onChange={(event) => aggiornaConto(tavoloSelezionato, "acconto", event.target.value)} />
                      <button type="button" disabled={closing} onClick={() => registraAcconto(ordineSelezionato)}>Registra</button>
                    </div>
                  </div>
                  {quotaPerPersona(ordineSelezionato) ? <div className="pos-split">Quota: {formatEuro(quotaPerPersona(ordineSelezionato))} a persona</div> : null}
                  <div className="pos-extra-row">
                    <input style={inputStyle} placeholder="Extra" value={extraInputs[tavoloSelezionato]?.nome || ""} onChange={(event) => aggiornaExtra(tavoloSelezionato, "nome", event.target.value)} />
                    <input style={inputStyle} placeholder="Prezzo" inputMode="decimal" value={extraInputs[tavoloSelezionato]?.prezzo || ""} onChange={(event) => aggiornaExtra(tavoloSelezionato, "prezzo", event.target.value)} />
                    <select style={inputStyle} value={extraInputs[tavoloSelezionato]?.preparationArea || "kitchen"} onChange={(event) => aggiornaExtra(tavoloSelezionato, "preparationArea", event.target.value)}>
                      <option value="kitchen">Cucina</option>
                      <option value="bar">Bar</option>
                    </select>
                    <button type="button" onClick={() => aggiungiPiatto(tavoloSelezionato)}>Aggiungi</button>
                  </div>
                  {orderAudit.length ? (
                    <details className="pos-audit">
                      <summary>Registro attività ({orderAudit.length})</summary>
                      <div>
                        {orderAudit.slice(0, 12).map((entry) => (
                          <p key={entry.id}>
                            <b>{entry.user?.name || "Sistema"}</b>
                            <span>
                              {entry.action === "order_item.void" ? "Articolo annullato" :
                                entry.action === "order_item.complimentary" ? "Articolo offerto" :
                                  entry.action === "order_item.restore" ? "Articolo ripristinato" :
                                    entry.action === "order.payment_added" ? "Pagamento registrato" :
                                      entry.action === "order.partial_payment" ? "Pagamento parziale" :
                                        entry.action === "order.closed" ? "Conto chiuso" : "Conto aggiornato"}
                              {entry.reason ? ` · ${entry.reason}` : ""}
                            </span>
                            <small>{formatDateTime(entry.createdAt)}</small>
                          </p>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </details>

                <div className="pos-main-actions">
                  <button type="button" onClick={() => stampaPreconto(tavoloSelezionato)}>Stampa</button>
                  <button type="button" className="is-primary" disabled={closing} onClick={() => chiudiConto(tavoloSelezionato)}>
                    {closing ? "Chiusura..." : "Chiudi conto"}
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      </div>

      {tavoloStampa && ordineSelezionato ? (
        <div className="print-area" style={{ display: "none" }}>
          <h2>Preconto tavolo {ordineSelezionato.tavolo}</h2>
          {(ordineSelezionato.piatti || []).map((p, index) => (
            <div key={`${p.nome}-${index}`}>{p.qty || 1} x {p.nome} - {formatEuro(parseNumber(p.prezzo) * parseNumber(p.qty || 1))}</div>
          ))}
          <hr />
          <strong>Totale {formatEuro(totaleFinale(ordineSelezionato))}</strong>
        </div>
      ) : null}
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
