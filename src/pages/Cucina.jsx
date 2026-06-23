import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import HighVolumeServiceBoard from "../components/ops/HighVolumeServiceBoard";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";
import { API_URL, getAuthHeaders } from "../lib/api";
import { createRestaurantSocket, playOrderSound } from "../lib/realtime";

function isBevanda(preparationArea) {
  return (preparationArea || "").toLowerCase().trim() === "bar";
}

function differenzaMinuti(timestamp) {
  if (!timestamp) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
}

function getPiattiCucina(ordine) {
  return (ordine?.items || []).filter((p) => !isBevanda(p.preparationArea));
}

function getStatoTavolo(ordine) {
  const piatti = getPiattiCucina(ordine);

  if (piatti.length === 0) {
    return {
      label: "Nessun piatto",
      bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
      detail: "Niente da preparare in cucina",
    };
  }

  if (ordine.status === "ready") {
    return {
      label: "Pronto",
      bg: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      detail: "Tutti i piatti sono pronti",
    };
  }

  if (ordine.status === "in_progress") {
    return {
      label: "In preparazione",
      bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      detail: "Piatti in lavorazione",
    };
  }

  if (ordine.status === "pending") {
    return {
      label: "Nuovo ordine",
      bg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      detail: "Sono arrivati nuovi piatti",
    };
  }

  if (ordine.status === "served") {
    return {
      label: "Servito",
      bg: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
      detail: "Ordine servito",
    };
  }

  return {
    label: "Attivo",
    bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    detail: "Ordine cucina attivo",
  };
}

function getPrioritaOrdine(ordine) {
  const piatti = getPiattiCucina(ordine);
  const minuti = differenzaMinuti(ordine.createdAt);

  if (ordine.status === "pending" && minuti >= 8) return 4;
  if (ordine.status === "pending") return 3;
  if (ordine.status === "in_progress" && minuti >= 18) return 2;
  if (ordine.status === "in_progress") return 1;
  if (piatti.length > 0 && ordine.status === "ready") return 0;
  return 0;
}

function getPrioritaOrdineLabel(ordine) {
  const minuti = differenzaMinuti(ordine.createdAt);

  if (ordine.status === "pending" && minuti >= 8) return "Urgente";
  if (ordine.status === "pending") return "Nuovo";
  if (ordine.status === "in_progress" && minuti >= 18) return "Attenzione";
  if (ordine.status === "in_progress") return "In corso";
  if (ordine.status === "ready") return "Da servire";
  if (ordine.status === "served") return "Servito";
  return "Attivo";
}

function getPrioritaPiatto(piatto, ordine) {
  const minuti = differenzaMinuti(ordine.createdAt);
  const servizio = piatto?.servizio || mapItemNoteToServizio(piatto);

  if (ordine.status === "pending" && minuti >= 8) return servizio === "subito" ? 6 : 4;
  if (ordine.status === "pending") return servizio === "subito" ? 5 : 3;
  if (ordine.status === "in_progress" && minuti >= 18) return servizio === "subito" ? 4 : 2;
  if (ordine.status === "in_progress") return servizio === "subito" ? 3 : 1;
  if (ordine.status === "ready") return 1;
  return 0;
}

function getPrioritaPiattoLabel(piatto, ordine) {
  const minuti = differenzaMinuti(ordine.createdAt);

  if (ordine.status === "pending" && minuti >= 8) return "Urgente";
  if (ordine.status === "pending") return "Nuovo";
  if (ordine.status === "in_progress" && minuti >= 18) return "Attenzione";
  if (ordine.status === "in_progress") return "In corso";
  if (ordine.status === "ready") return "Pronto";
  if (ordine.status === "served") return "Servito";
  return "Attivo";
}

function colorePiatto(statoOrdine) {
  if (statoOrdine === "pending") {
    return "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)";
  }
  if (statoOrdine === "in_progress") {
    return "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
  }
  if (statoOrdine === "served") {
    return "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)";
  }
  return "linear-gradient(135deg, #16a34a 0%, #15803d 100%)";
}

function testoProssimoStep(statoOrdine) {
  if (statoOrdine === "pending") return "Segna in preparazione";
  if (statoOrdine === "in_progress") return "Segna pronto";
  if (statoOrdine === "ready") return "Già pronto";
  return "Completato";
}

function pillButton(active) {
  return {
    border: "none",
    borderRadius: 999,
    padding: "10px 14px",
    background: active ? "#111827" : "#e5e7eb",
    color: active ? "white" : "#111827",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
  };
}

function getGridConfig(total) {
  if (total <= 4) return { cols: 2, gap: 14 };
  if (total <= 8) return { cols: 3, gap: 12 };
  if (total <= 12) return { cols: 4, gap: 10 };
  if (total <= 20) return { cols: 5, gap: 9 };
  if (total <= 30) return { cols: 6, gap: 8 };
  return { cols: 7, gap: 8 };
}

function formatoOra(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function quantitaTotale(lista) {
  return (lista || []).reduce((acc, item) => acc + Number(item.quantity || 0), 0);
}

function statoRank(statoOrdine) {
  if (statoOrdine === "pending") return 0;
  if (statoOrdine === "in_progress") return 1;
  if (statoOrdine === "ready") return 2;
  return 3;
}

function servizioRank(servizio) {
  return (servizio || "subito") === "subito" ? 0 : 1;
}

function mapItemNoteToServizio(item) {
  const note = (item?.notes || "").toLowerCase().trim();
  if (note.includes("dopo")) return "dopo";
  return "subito";
}

function Cucina() {
  const [ordini, setOrdini] = useState([]);
  const [filtroVista, setFiltroVista] = useState("tutti");
  const [soloUrgenti, setSoloUrgenti] = useState(false);
  const [modalitaVista, setModalitaVista] = useState("tavoli");
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState([]);
  const audioAbilitato = useRef(false);
  const ultimoConteggioCucinaRef = useRef(0);

  useEffect(() => {
    const abilitaAudio = () => {
      audioAbilitato.current = true;
      window.removeEventListener("click", abilitaAudio);
    };

    window.addEventListener("click", abilitaAudio);
    return () => window.removeEventListener("click", abilitaAudio);
  }, []);

  async function syncOrdini() {
    try {
      const response = await fetch(`${API_URL}/orders/kitchen/list`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Errore nel caricamento ordini cucina");
      }

      const lista = Array.isArray(data) ? data : [];
      setOrdini(lista);

      const totalePiattiCucina = lista.reduce(
        (acc, ordine) => acc + getPiattiCucina(ordine).length,
        0
      );

      if (
        audioAbilitato.current &&
        ultimoConteggioCucinaRef.current > 0 &&
        totalePiattiCucina > ultimoConteggioCucinaRef.current
      ) {
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.play().catch(() => {});
      }

      ultimoConteggioCucinaRef.current = totalePiattiCucina;
      setErrore("");
    } catch (error) {
      setErrore(error.message || "Errore nel caricamento cucina");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    syncOrdini();
    const timer = setInterval(syncOrdini, 8000);
    const socket = createRestaurantSocket();

    const refreshLive = async () => {
      if (audioAbilitato.current) playOrderSound();
      await syncOrdini();
    };

    socket.on("new-order", refreshLive);
    socket.on("order-updated", refreshLive);
    socket.on("order-closed", refreshLive);

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, []);

  async function cambiaStatoOrdine(orderId, nuovoStato) {
    try {
      setUpdatingIds((prev) => [...prev, orderId]);

      const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nuovoStato }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Errore aggiornamento stato");
      }

      setOrdini((prev) =>
        prev.map((ordine) => (ordine.id === orderId ? data.order : ordine))
      );
    } catch (error) {
      setErrore(error.message || "Errore aggiornamento stato");
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== orderId));
    }
  }

  function cambiaStato(orderId, statoCorrente) {
    if (statoCorrente === "pending") {
      cambiaStatoOrdine(orderId, "in_progress");
    } else if (statoCorrente === "in_progress") {
      cambiaStatoOrdine(orderId, "ready");
    }
  }

  function riportaIndietro(orderId, statoCorrente) {
    if (statoCorrente === "ready") {
      cambiaStatoOrdine(orderId, "in_progress");
    } else if (statoCorrente === "in_progress") {
      cambiaStatoOrdine(orderId, "pending");
    }
  }

  function segnaTuttoPronto(orderId) {
    cambiaStatoOrdine(orderId, "ready");
  }

  function segnaTuttoPreparazione(orderId) {
    cambiaStatoOrdine(orderId, "in_progress");
  }

  const ordiniCucina = useMemo(() => {
    return ordini
      .map((ordine) => {
        let piattiFiltrati = getPiattiCucina(ordine).map((p, indexOriginale) => ({
          ...p,
          indexOriginale,
          nome: p.nameSnapshot,
          qty: p.quantity,
          stato: ordine.status,
          servizio: mapItemNoteToServizio(p),
          categoria: p.categorySnapshot || (p.preparationArea === "bar" ? "Bevande" : "Cucina"),
          nota: p.notes || "",
        }));

        if (filtroVista === "subito") {
          piattiFiltrati = piattiFiltrati.filter((p) => (p.servizio || "subito") === "subito");
        }

        if (filtroVista === "dopo") {
          piattiFiltrati = piattiFiltrati.filter((p) => p.servizio === "dopo");
        }

        if (filtroVista === "nuovi") {
          piattiFiltrati = piattiFiltrati.filter(() => ordine.status === "pending");
        }

        if (filtroVista === "preparazione") {
          piattiFiltrati = piattiFiltrati.filter(() => ordine.status === "in_progress");
        }

        if (filtroVista === "pronti") {
          piattiFiltrati = piattiFiltrati.filter(() => ordine.status === "ready");
        }

        const timerMinuti = differenzaMinuti(ordine.createdAt);
        const priorita = getPrioritaOrdine(ordine);

        if (soloUrgenti && priorita < 3) return null;

        return {
          ...ordine,
          tavolo: ordine.table?.code || ordine.table?.name || "-",
          tavoloNome: ordine.table?.name || "Tavolo",
          piattiCucina: piattiFiltrati.sort((a, b) => {
            const byServizio = servizioRank(a.servizio) - servizioRank(b.servizio);
            if (byServizio !== 0) return byServizio;
            return String(a.nome || "").localeCompare(String(b.nome || ""), "it", { numeric: true });
          }),
          timerMinuti,
          priorita,
          prioritaLabel: getPrioritaOrdineLabel(ordine),
          statoTavolo: getStatoTavolo(ordine),
          totaleArticoli: quantitaTotale(piattiFiltrati),
        };
      })
      .filter((ordine) => ordine && ordine.piattiCucina.length > 0)
      .sort((a, b) => {
        if (b.priorita !== a.priorita) return b.priorita - a.priorita;
        if (b.timerMinuti !== a.timerMinuti) return b.timerMinuti - a.timerMinuti;
        return String(a.tavolo).localeCompare(String(b.tavolo), "it", { numeric: true });
      });
  }, [ordini, filtroVista, soloUrgenti]);

  const piattiQueue = useMemo(() => {
    const lista = [];

    ordiniCucina.forEach((ordine) => {
      ordine.piattiCucina.forEach((piatto) => {
        lista.push({
          ...piatto,
          tavolo: ordine.tavolo,
          orderId: ordine.id,
          nota: ordine.notes || "",
          time: ordine.createdAt,
          timerMinuti: ordine.timerMinuti,
          priorita: getPrioritaPiatto(piatto, ordine),
          prioritaLabel: getPrioritaPiattoLabel(piatto, ordine),
          categoria: piatto.categoria || "Cucina",
          notaPiatto: piatto.notes || piatto.nota || "",
        });
      });
    });

    return lista.sort((a, b) => {
      if (b.priorita !== a.priorita) return b.priorita - a.priorita;
      if (b.timerMinuti !== a.timerMinuti) return b.timerMinuti - a.timerMinuti;
      if (servizioRank(a.servizio) !== servizioRank(b.servizio)) {
        return servizioRank(a.servizio) - servizioRank(b.servizio);
      }
      return String(a.tavolo).localeCompare(String(b.tavolo), "it", { numeric: true });
    });
  }, [ordiniCucina]);

  const piattiTotali = ordiniCucina.reduce((acc, o) => acc + o.piattiCucina.length, 0);
  const nuoviCount = ordiniCucina.reduce(
    (acc, o) => acc + o.piattiCucina.filter(() => o.status === "pending").length,
    0
  );
  const preparazioneCount = ordiniCucina.reduce(
    (acc, o) => acc + o.piattiCucina.filter(() => o.status === "in_progress").length,
    0
  );
  const prontiCount = ordiniCucina.reduce(
    (acc, o) => acc + o.piattiCucina.filter(() => o.status === "ready").length,
    0
  );
  const urgentiCount = ordiniCucina.filter((o) => o.priorita >= 3).length;

  const tavoliGrid = useMemo(() => getGridConfig(ordiniCucina.length || 1), [ordiniCucina.length]);
  const piattiGrid = useMemo(() => getGridConfig(piattiQueue.length || 1), [piattiQueue.length]);

  const tavoliHeight = "calc(100vh - 350px)";
  const piattiHeight = "calc(100vh - 350px)";

  const righeTavoli = Math.ceil((ordiniCucina.length || 1) / tavoliGrid.cols) || 1;
  const cardHeightTavoli = `calc((${tavoliHeight} - ${(righeTavoli - 1) * tavoliGrid.gap}px) / ${righeTavoli})`;

  const righePiatti = Math.ceil((piattiQueue.length || 1) / piattiGrid.cols) || 1;
  const cardHeightPiatti = `calc((${piattiHeight} - ${(righePiatti - 1) * piattiGrid.gap}px) / ${righePiatti})`;

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div style={{ ...appShellStyle, paddingTop: 12, paddingLeft: 70, paddingRight: 16 }}>
        <HighVolumeServiceBoard
          title="Cucina"
          subtitle="Pass chef: urgenze davanti, batch piatti raggruppati e comande separate tra nuovi, in preparazione e pronti."
          station="kitchen"
          loading={loading}
          error={errore}
          orders={ordiniCucina}
          itemsKey="piattiCucina"
          totalItems={piattiTotali}
          newCount={nuoviCount}
          inProgressCount={preparazioneCount}
          readyCount={prontiCount}
          urgentCount={urgentiCount}
          updatingIds={updatingIds}
          onRefresh={syncOrdini}
          onNext={cambiaStato}
          onBack={riportaIndietro}
          onReadyAll={segnaTuttoPronto}
          readyLabel="Pronto"
        />
      </div>
    </div>
  );
}

export default Cucina;
