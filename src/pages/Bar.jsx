import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import CommandDock from "../components/CommandDock";
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

function getPiattiBar(ordine) {
  return (ordine?.items || []).filter((p) => isBevanda(p.preparationArea));
}

function getStatoTavoloBar(ordine) {
  const piatti = getPiattiBar(ordine);

  if (piatti.length === 0) {
    return {
      label: "Nessuna bevanda",
      bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
      detail: "Niente da preparare al bar",
    };
  }

  if (ordine.status === "ready") {
    return {
      label: "Pronto",
      bg: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      detail: "Tutte le bevande sono pronte",
    };
  }

  if (ordine.status === "in_progress") {
    return {
      label: "In preparazione",
      bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      detail: "Ci sono bevande in lavorazione",
    };
  }

  if (ordine.status === "pending") {
    return {
      label: "Nuovo ordine",
      bg: "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
      detail: "Sono arrivate nuove bevande",
    };
  }

  if (ordine.status === "served") {
    return {
      label: "Servito",
      bg: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
      detail: "Ordine completato",
    };
  }

  if (ordine.status === "cancelled") {
    return {
      label: "Annullato",
      bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      detail: "Ordine annullato",
    };
  }

  return {
    label: "Attivo",
    bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    detail: "Ordine bevande attivo",
  };
}

function getPrioritaOrdineBar(ordine) {
  const piatti = getPiattiBar(ordine);
  const minuti = differenzaMinuti(ordine.createdAt);

  if (ordine.status === "pending" && minuti >= 8) return 4;
  if (ordine.status === "pending") return 3;
  if (ordine.status === "in_progress" && minuti >= 15) return 2;
  if (ordine.status === "in_progress") return 1;
  if (piatti.length > 0 && ordine.status === "ready") return 0;
  return 0;
}

function getPrioritaOrdineBarLabel(ordine) {
  const minuti = differenzaMinuti(ordine.createdAt);

  if (ordine.status === "pending" && minuti >= 8) return "Urgente";
  if (ordine.status === "pending") return "Nuovo";
  if (ordine.status === "in_progress" && minuti >= 15) return "Attenzione";
  if (ordine.status === "in_progress") return "In corso";
  if (ordine.status === "ready") return "Da servire";
  return "Attivo";
}

function getPrioritaPiattoBar(_piatto, ordine) {
  const minuti = differenzaMinuti(ordine.createdAt);

  if (ordine.status === "pending" && minuti >= 8) return 5;
  if (ordine.status === "pending") return 4;
  if (ordine.status === "in_progress" && minuti >= 15) return 3;
  if (ordine.status === "in_progress") return 2;
  if (ordine.status === "ready") return 1;
  return 0;
}

function getPrioritaPiattoBarLabel(_piatto, ordine) {
  const minuti = differenzaMinuti(ordine.createdAt);

  if (ordine.status === "pending" && minuti >= 8) return "Urgente";
  if (ordine.status === "pending") return "Nuovo";
  if (ordine.status === "in_progress" && minuti >= 15) return "Attenzione";
  if (ordine.status === "in_progress") return "In corso";
  if (ordine.status === "ready") return "Pronto";
  return "Attivo";
}

function colorePiatto(stato) {
  if (stato === "pending") return "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)";
  if (stato === "in_progress") return "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
  if (stato === "ready") return "linear-gradient(135deg, #16a34a 0%, #15803d 100%)";
  if (stato === "served") return "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)";
  return "linear-gradient(135deg, #64748b 0%, #475569 100%)";
}

function testoProssimoStep(stato) {
  if (stato === "pending") return "Segna in preparazione";
  if (stato === "in_progress") return "Segna pronta";
  if (stato === "ready") return "Già pronta";
  return "Nessuna azione";
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

function statoRank(stato) {
  if (stato === "pending") return 0;
  if (stato === "in_progress") return 1;
  if (stato === "ready") return 2;
  if (stato === "served") return 3;
  return 4;
}

function Bar() {
  const [ordini, setOrdini] = useState([]);
  const [ultimoConteggioBar, setUltimoConteggioBar] = useState(0);
  const [filtroVista, setFiltroVista] = useState("tutti");
  const [soloUrgenti, setSoloUrgenti] = useState(false);
  const [modalitaVista, setModalitaVista] = useState("tavoli");
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingIds, setUpdatingIds] = useState([]);
  const audioAbilitato = useRef(false);

  useEffect(() => {
    const abilitaAudio = () => {
      audioAbilitato.current = true;
      window.removeEventListener("click", abilitaAudio);
    };

    window.addEventListener("click", abilitaAudio);
    return () => window.removeEventListener("click", abilitaAudio);
  }, []);

  const syncOrdini = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);

      const response = await fetch(`${API_URL}/orders/kitchen/list`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Errore nel caricamento ordini bar");
      }

      const lista = Array.isArray(data) ? data : [];
      setOrdini(lista);

      const totalePiattiBar = lista.reduce((acc, ordine) => acc + getPiattiBar(ordine).length, 0);

      if (
        audioAbilitato.current &&
        ultimoConteggioBar > 0 &&
        totalePiattiBar > ultimoConteggioBar
      ) {
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.play().catch(() => {});
      }

      setUltimoConteggioBar(totalePiattiBar);
      setErrore("");
    } catch (error) {
      setErrore(error.message || "Errore nel caricamento bar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ultimoConteggioBar]);

  useEffect(() => {
    syncOrdini();
    const timer = setInterval(() => syncOrdini(), 8000);
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
  }, [syncOrdini]);

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

  function segnaServito(orderId) {
    cambiaStatoOrdine(orderId, "served");
  }

  function annullaOrdine(orderId) {
    const conferma = window.confirm("Vuoi davvero annullare questo ordine?");
    if (!conferma) return;
    cambiaStatoOrdine(orderId, "cancelled");
  }

  const ordiniBar = useMemo(() => {
    return ordini
      .map((ordine) => {
        let piattiFiltrati = getPiattiBar(ordine).map((p, indexOriginale) => ({
          ...p,
          indexOriginale,
          nome: p.nameSnapshot,
          qty: p.quantity,
          stato: ordine.status,
        }));

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
        const priorita = getPrioritaOrdineBar(ordine);

        if (soloUrgenti && priorita < 3) return null;

        return {
          ...ordine,
          tavolo: ordine.table?.code || ordine.table?.name || "-",
          tavoloNome: ordine.table?.name || "Tavolo",
          piattiBar: piattiFiltrati.sort((a, b) => statoRank(a.stato) - statoRank(b.stato)),
          timerMinuti,
          priorita,
          prioritaLabel: getPrioritaOrdineBarLabel(ordine),
          statoTavolo: getStatoTavoloBar(ordine),
          totaleArticoli: quantitaTotale(piattiFiltrati),
        };
      })
      .filter((ordine) => ordine && ordine.piattiBar.length > 0)
      .sort((a, b) => {
        if (b.priorita !== a.priorita) return b.priorita - a.priorita;
        if (b.timerMinuti !== a.timerMinuti) return b.timerMinuti - a.timerMinuti;
        return String(a.tavolo).localeCompare(String(b.tavolo), "it", { numeric: true });
      });
  }, [ordini, filtroVista, soloUrgenti]);

  const bevandeQueue = useMemo(() => {
    const lista = [];

    ordiniBar.forEach((ordine) => {
      ordine.piattiBar.forEach((piatto) => {
        lista.push({
          ...piatto,
          tavolo: ordine.tavolo,
          tavoloNome: ordine.tavoloNome,
          orderId: ordine.id,
          nota: ordine.notes || "",
          time: ordine.createdAt,
          timerMinuti: ordine.timerMinuti,
          priorita: getPrioritaPiattoBar(piatto, ordine),
          prioritaLabel: getPrioritaPiattoBarLabel(piatto, ordine),
        });
      });
    });

    return lista.sort((a, b) => {
      if (b.priorita !== a.priorita) return b.priorita - a.priorita;
      if (b.timerMinuti !== a.timerMinuti) return b.timerMinuti - a.timerMinuti;
      return String(a.tavolo).localeCompare(String(b.tavolo), "it", { numeric: true });
    });
  }, [ordiniBar]);

  const bevandeTotali = ordiniBar.reduce((acc, o) => acc + o.piattiBar.length, 0);
  const nuoviCount = ordiniBar.reduce(
    (acc, o) => acc + o.piattiBar.filter(() => o.status === "pending").length,
    0
  );
  const preparazioneCount = ordiniBar.reduce(
    (acc, o) => acc + o.piattiBar.filter(() => o.status === "in_progress").length,
    0
  );
  const prontiCount = ordiniBar.reduce(
    (acc, o) => acc + o.piattiBar.filter(() => o.status === "ready").length,
    0
  );
  const urgentiCount = ordiniBar.filter((o) => o.priorita >= 3).length;

  const tavoliGrid = useMemo(() => getGridConfig(ordiniBar.length || 1), [ordiniBar.length]);
  const bevandeGrid = useMemo(() => getGridConfig(bevandeQueue.length || 1), [bevandeQueue.length]);

  const tavoliHeight = "calc(100vh - 350px)";
  const bevandeHeight = "calc(100vh - 350px)";

  const righeTavoli = Math.ceil((ordiniBar.length || 1) / tavoliGrid.cols) || 1;
  const cardHeightTavoli = `calc((${tavoliHeight} - ${(righeTavoli - 1) * tavoliGrid.gap}px) / ${righeTavoli})`;

  const righeBevande = Math.ceil((bevandeQueue.length || 1) / bevandeGrid.cols) || 1;
  const cardHeightBevande = `calc((${bevandeHeight} - ${(righeBevande - 1) * bevandeGrid.gap}px) / ${righeBevande})`;

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div className="em-v2-shell" style={{ paddingBottom: 0 }}>
        <CommandDock compact />
      </div>
      <div style={{ ...appShellStyle, paddingTop: 0 }}>
        <HighVolumeServiceBoard
          title="Bar"
          subtitle="Bevande in coda, contatori live e ricerca tavolo pensati per picchi di servizio rapidi."
          station="bar"
          loading={loading}
          error={errore}
          orders={ordiniBar}
          itemsKey="piattiBar"
          totalItems={bevandeTotali}
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

export default Bar;