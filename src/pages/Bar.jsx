import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import HighVolumeServiceBoard from "../components/ops/HighVolumeServiceBoard";
import { glowPageStyle } from "../styles/pageStyles";
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

function getPrioritaOrdineBar(ordine) {
  const minuti = differenzaMinuti(ordine.createdAt);
  if (ordine.status === "pending" && minuti >= 5) return 4;
  if (ordine.status === "pending") return 3;
  if (ordine.status === "in_progress" && minuti >= 10) return 2;
  if (ordine.status === "in_progress") return 1;
  return 0;
}

function getPrioritaOrdineBarLabel(ordine) {
  const minuti = differenzaMinuti(ordine.createdAt);
  if (ordine.status === "pending" && minuti >= 5) return "Urgente";
  if (ordine.status === "pending") return "Nuovo";
  if (ordine.status === "in_progress" && minuti >= 10) return "Attenzione";
  if (ordine.status === "in_progress") return "In corso";
  if (ordine.status === "ready") return "Pronto";
  return "Attivo";
}

function quantitaTotale(lista) {
  return (lista || []).reduce((acc, item) => acc + Number(item.quantity || item.qty || 0), 0);
}

function statoRank(stato) {
  if (stato === "pending") return 0;
  if (stato === "in_progress") return 1;
  if (stato === "ready") return 2;
  if (stato === "served") return 3;
  return 4;
}

export default function Bar() {
  const [ordini, setOrdini] = useState([]);
  const [ultimoConteggioBar, setUltimoConteggioBar] = useState(0);
  const [errore, setErrore] = useState("");
  const [loading, setLoading] = useState(true);
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

  const syncOrdini = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/orders/kitchen/list`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Errore nel caricamento ordini bar");

      const lista = Array.isArray(data) ? data : [];
      setOrdini(lista);

      const totalePiattiBar = lista.reduce((acc, ordine) => acc + getPiattiBar(ordine).length, 0);
      if (audioAbilitato.current && ultimoConteggioBar > 0 && totalePiattiBar > ultimoConteggioBar) {
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.play().catch(() => {});
      }

      setUltimoConteggioBar(totalePiattiBar);
      setErrore("");
    } catch (error) {
      setErrore(error.message || "Errore nel caricamento bar");
    } finally {
      setLoading(false);
    }
  }, [ultimoConteggioBar]);

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
      if (!response.ok) throw new Error(data.message || "Errore aggiornamento stato");

      setOrdini((prev) => prev.map((ordine) => (ordine.id === orderId ? data.order : ordine)));
    } catch (error) {
      setErrore(error.message || "Errore aggiornamento stato");
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== orderId));
    }
  }

  function cambiaStato(orderId, statoCorrente) {
    if (statoCorrente === "pending") cambiaStatoOrdine(orderId, "in_progress");
    if (statoCorrente === "in_progress") cambiaStatoOrdine(orderId, "ready");
  }

  function riportaIndietro(orderId, statoCorrente) {
    if (statoCorrente === "ready") cambiaStatoOrdine(orderId, "in_progress");
    if (statoCorrente === "in_progress") cambiaStatoOrdine(orderId, "pending");
  }

  const ordiniBar = useMemo(() => {
    return ordini
      .map((ordine) => {
        const piattiBar = getPiattiBar(ordine)
          .map((p, indexOriginale) => ({
            ...p,
            indexOriginale,
            nome: p.nameSnapshot,
            qty: p.quantity,
            stato: ordine.status,
            categoria: p.categorySnapshot || "Bar",
            nota: p.notes || "",
          }))
          .sort((a, b) => statoRank(a.stato) - statoRank(b.stato));

        const timerMinuti = differenzaMinuti(ordine.createdAt);
        const priorita = getPrioritaOrdineBar(ordine);

        return {
          ...ordine,
          tavolo: ordine.table?.code || ordine.table?.name || "-",
          tavoloNome: ordine.table?.name || "Tavolo",
          piattiBar,
          timerMinuti,
          priorita,
          prioritaLabel: getPrioritaOrdineBarLabel(ordine),
          totaleArticoli: quantitaTotale(piattiBar),
        };
      })
      .filter((ordine) => ordine.piattiBar.length > 0)
      .sort((a, b) => {
        if (b.priorita !== a.priorita) return b.priorita - a.priorita;
        if (b.timerMinuti !== a.timerMinuti) return b.timerMinuti - a.timerMinuti;
        return String(a.tavolo).localeCompare(String(b.tavolo), "it", { numeric: true });
      });
  }, [ordini]);

  const bevandeTotali = ordiniBar.reduce((acc, o) => acc + o.totaleArticoli, 0);
  const nuoviCount = ordiniBar.filter((o) => o.status === "pending").length;
  const preparazioneCount = ordiniBar.filter((o) => o.status === "in_progress").length;
  const prontiCount = ordiniBar.filter((o) => o.status === "ready").length;
  const urgentiCount = ordiniBar.filter((o) => o.priorita >= 3).length;

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div className="operator-workspace">
        <HighVolumeServiceBoard
          title="Bar"
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
          readyLabel="Pronto"
        />
      </div>
    </div>
  );
}
