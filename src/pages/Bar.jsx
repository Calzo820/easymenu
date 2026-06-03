import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
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
                  <span className="status-dot" style={{ background: "#06b6d4" }} />
                  Bar live
                </div>
                <h1 style={{ margin: 0, fontSize: 34 }}>Bar operativo</h1>
                <p style={{ marginTop: 10, opacity: 0.9 }}>
                  Ordini bevande reali dal backend — tutto visibile il più possibile a schermo
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div className="topbar-chip">Click una volta per attivare il suono</div>
                <div className="topbar-chip">Priorità in alto</div>
                <div className="topbar-chip">Pronte: {prontiCount}</div>
                <button
                  onClick={() => syncOrdini(true)}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "10px 14px",
                    background: "#111827",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: 13,
                    opacity: refreshing ? 0.7 : 1,
                  }}
                >
                  {refreshing ? "Aggiorno..." : "Aggiorna"}
                </button>
              </div>
            </div>
          </div>

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

          <div
            className="os-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginBottom: 16,
            }}
          >
            <div className="metric-card">
              <div className="metric-label">Tavoli attivi</div>
              <div className="metric-value">{ordiniBar.length}</div>
              <div className="metric-badge">al bar</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Bevande totali</div>
              <div className="metric-value">{bevandeTotali}</div>
              <div className="metric-badge">da gestire</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Nuove</div>
              <div className="metric-value">{nuoviCount}</div>
              <div className="metric-badge">da prendere</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">In preparazione</div>
              <div className="metric-value">{preparazioneCount}</div>
              <div className="metric-badge">al lavoro</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Urgenti</div>
              <div className="metric-value">{urgentiCount}</div>
              <div className="metric-badge">priorità alta</div>
            </div>
          </div>

          <div className="section-card" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  style={pillButton(modalitaVista === "tavoli")}
                  onClick={() => setModalitaVista("tavoli")}
                >
                  Vista tavoli
                </button>
                <button
                  style={pillButton(modalitaVista === "bevande")}
                  onClick={() => setModalitaVista("bevande")}
                >
                  Vista bevande
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={pillButton(filtroVista === "tutti")} onClick={() => setFiltroVista("tutti")}>
                  Tutte
                </button>
                <button style={pillButton(filtroVista === "nuovi")} onClick={() => setFiltroVista("nuovi")}>
                  Nuove
                </button>
                <button
                  style={pillButton(filtroVista === "preparazione")}
                  onClick={() => setFiltroVista("preparazione")}
                >
                  Prep
                </button>
                <button style={pillButton(filtroVista === "pronti")} onClick={() => setFiltroVista("pronti")}>
                  Pronte
                </button>
              </div>

              <label
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                <input
                  type="checkbox"
                  checked={soloUrgenti}
                  onChange={(e) => setSoloUrgenti(e.target.checked)}
                />
                Solo urgenti
              </label>
            </div>
          </div>

          {loading ? (
            <div className="section-card">
              <div className="panel-title">Caricamento ordini bar...</div>
            </div>
          ) : modalitaVista === "tavoli" ? (
            ordiniBar.length === 0 ? (
              <div className="section-card">
                <div className="panel-title">Nessun ordine bevande</div>
                <div className="panel-subtitle">Quando arrivano bevande, compaiono qui.</div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${tavoliGrid.cols}, 1fr)`,
                  gap: tavoliGrid.gap,
                  height: tavoliHeight,
                }}
              >
                {ordiniBar.map((ordine) => {
                  const updating = updatingIds.includes(ordine.id);

                  return (
                    <div
                      key={ordine.id}
                      className="section-card"
                      style={{
                        height: cardHeightTavoli,
                        minHeight: 120,
                        padding: 0,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        border:
                          ordine.priorita >= 3
                            ? "2px solid rgba(239,68,68,0.28)"
                            : "1px solid rgba(255,255,255,0.6)",
                      }}
                    >
                      <div
                        style={{
                          background: ordine.statoTavolo.bg,
                          color: "white",
                          padding: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 900 }}>{ordine.tavoloNome}</div>
                            <div style={{ marginTop: 2, fontWeight: 800, fontSize: 12 }}>
                              {ordine.statoTavolo.label}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <div
                              style={{
                                background: "rgba(255,255,255,0.18)",
                                borderRadius: 999,
                                padding: "5px 8px",
                                fontWeight: 900,
                                fontSize: 11,
                              }}
                            >
                              {ordine.prioritaLabel}
                            </div>

                            <div
                              style={{
                                background: "rgba(255,255,255,0.18)",
                                borderRadius: 999,
                                padding: "5px 8px",
                                fontWeight: 900,
                                fontSize: 11,
                              }}
                            >
                              {ordine.timerMinuti} min
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 10,
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          overflow: "auto",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#475569",
                            }}
                          >
                            {ordine.piattiBar.length} righe · {ordine.totaleArticoli} pezzi
                          </div>

                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            Arrivato alle {formatoOra(ordine.createdAt)}
                          </div>
                        </div>

                        {ordine.piattiBar.map((p) => (
                          <div
                            key={`${ordine.id}-${p.id}`}
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e5e7eb",
                              borderRadius: 14,
                              padding: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                                alignItems: "center",
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: "#111827",
                                    lineHeight: 1.15,
                                  }}
                                >
                                  {p.nome} x{p.qty}
                                </div>

                                <div
                                  style={{
                                    marginTop: 6,
                                    display: "flex",
                                    gap: 6,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      background:
                                        ordine.status === "pending"
                                          ? "#dbeafe"
                                          : ordine.status === "in_progress"
                                          ? "#fef3c7"
                                          : ordine.status === "ready"
                                          ? "#dcfce7"
                                          : "#e0f2fe",
                                      color:
                                        ordine.status === "pending"
                                          ? "#1d4ed8"
                                          : ordine.status === "in_progress"
                                          ? "#92400e"
                                          : ordine.status === "ready"
                                          ? "#166534"
                                          : "#0c4a6e",
                                      borderRadius: 999,
                                      padding: "4px 8px",
                                      fontWeight: 800,
                                      fontSize: 11,
                                    }}
                                  >
                                    {ordine.status}
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {ordine.status !== "pending" && ordine.status !== "served" && ordine.status !== "cancelled" ? (
                                  <button
                                    onClick={() => riportaIndietro(ordine.id, ordine.status)}
                                    disabled={updating}
                                    style={{
                                      border: "none",
                                      borderRadius: 10,
                                      padding: "8px 10px",
                                      background: "#e5e7eb",
                                      color: "#111827",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      fontSize: 12,
                                      opacity: updating ? 0.7 : 1,
                                    }}
                                  >
                                    Indietro
                                  </button>
                                ) : null}

                                {ordine.status !== "ready" && ordine.status !== "served" && ordine.status !== "cancelled" ? (
                                  <button
                                    onClick={() => cambiaStato(ordine.id, ordine.status)}
                                    disabled={updating}
                                    style={{
                                      border: "none",
                                      borderRadius: 10,
                                      padding: "8px 10px",
                                      background: "#111827",
                                      color: "white",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      fontSize: 12,
                                      opacity: updating ? 0.7 : 1,
                                    }}
                                  >
                                    {testoProssimoStep(ordine.status)}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}

                        {ordine.notes ? (
                          <div
                            style={{
                              background: "#fff7ed",
                              border: "1px solid #fed7aa",
                              borderRadius: 14,
                              padding: 10,
                              fontSize: 12,
                              color: "#9a3412",
                            }}
                          >
                            <b>Nota:</b> {ordine.notes}
                          </div>
                        ) : null}

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            marginTop: "auto",
                          }}
                        >
                          {ordine.status !== "in_progress" && ordine.status !== "ready" && ordine.status !== "served" && ordine.status !== "cancelled" ? (
                            <button
                              onClick={() => segnaTuttoPreparazione(ordine.id)}
                              disabled={updating}
                              style={{
                                flex: 1,
                                border: "none",
                                borderRadius: 12,
                                padding: "10px 12px",
                                background: "#f59e0b",
                                color: "white",
                                fontWeight: 900,
                                cursor: "pointer",
                                opacity: updating ? 0.7 : 1,
                              }}
                            >
                              Tutte in prep
                            </button>
                          ) : null}

                          {ordine.status !== "ready" && ordine.status !== "served" && ordine.status !== "cancelled" ? (
                            <button
                              onClick={() => segnaTuttoPronto(ordine.id)}
                              disabled={updating}
                              style={{
                                flex: 1,
                                border: "none",
                                borderRadius: 12,
                                padding: "10px 12px",
                                background: "#16a34a",
                                color: "white",
                                fontWeight: 900,
                                cursor: "pointer",
                                opacity: updating ? 0.7 : 1,
                              }}
                            >
                              Tutte pronte
                            </button>
                          ) : null}

                          {ordine.status === "ready" ? (
                            <button
                              onClick={() => segnaServito(ordine.id)}
                              disabled={updating}
                              style={{
                                flex: 1,
                                border: "none",
                                borderRadius: 12,
                                padding: "10px 12px",
                                background: "#0891b2",
                                color: "white",
                                fontWeight: 900,
                                cursor: "pointer",
                                opacity: updating ? 0.7 : 1,
                              }}
                            >
                              Segna servito
                            </button>
                          ) : null}

                          {ordine.status !== "served" && ordine.status !== "cancelled" ? (
                            <button
                              onClick={() => annullaOrdine(ordine.id)}
                              disabled={updating}
                              style={{
                                flex: 1,
                                border: "none",
                                borderRadius: 12,
                                padding: "10px 12px",
                                background: "#ef4444",
                                color: "white",
                                fontWeight: 900,
                                cursor: "pointer",
                                opacity: updating ? 0.7 : 1,
                              }}
                            >
                              Annulla
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : bevandeQueue.length === 0 ? (
            <div className="section-card">
              <div className="panel-title">Nessuna bevanda nella coda</div>
              <div className="panel-subtitle">Cambia filtro o aspetta nuovi ordini.</div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${bevandeGrid.cols}, 1fr)`,
                gap: bevandeGrid.gap,
                height: bevandeHeight,
              }}
            >
              {bevandeQueue.map((piatto, i) => {
                const updating = updatingIds.includes(piatto.orderId);

                return (
                  <div
                    key={`${piatto.orderId}-${piatto.id}-${i}`}
                    className="section-card"
                    style={{
                      height: cardHeightBevande,
                      minHeight: 120,
                      padding: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      border:
                        piatto.priorita >= 4
                          ? "2px solid rgba(239,68,68,0.28)"
                          : "1px solid rgba(255,255,255,0.6)",
                    }}
                  >
                    <div
                      style={{
                        background: colorePiatto(piatto.stato),
                        color: "white",
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 900 }}>{piatto.tavoloNome}</div>
                          <div style={{ marginTop: 2, fontWeight: 800, fontSize: 12 }}>
                            {piatto.prioritaLabel}
                          </div>
                        </div>

                        <div
                          style={{
                            background: "rgba(255,255,255,0.18)",
                            borderRadius: 999,
                            padding: "5px 8px",
                            fontWeight: 900,
                            fontSize: 11,
                          }}
                        >
                          {piatto.timerMinuti} min
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        flex: 1,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.15 }}>
                          {piatto.nome}
                        </div>
                        <div style={{ marginTop: 6, color: "#475569", fontWeight: 700 }}>
                          Quantità: {piatto.qty}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            borderRadius: 999,
                            padding: "4px 8px",
                            background:
                              piatto.stato === "pending"
                                ? "#dbeafe"
                                : piatto.stato === "in_progress"
                                ? "#fef3c7"
                                : piatto.stato === "ready"
                                ? "#dcfce7"
                                : "#e0f2fe",
                            color:
                              piatto.stato === "pending"
                                ? "#1d4ed8"
                                : piatto.stato === "in_progress"
                                ? "#92400e"
                                : piatto.stato === "ready"
                                ? "#166534"
                                : "#0c4a6e",
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        >
                          {piatto.stato}
                        </span>

                        <span
                          style={{
                            borderRadius: 999,
                            padding: "4px 8px",
                            background: "#f1f5f9",
                            color: "#334155",
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        >
                          {formatoOra(piatto.time)}
                        </span>
                      </div>

                      {piatto.nota ? (
                        <div
                          style={{
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: 12,
                            padding: 10,
                            fontSize: 12,
                            color: "#9a3412",
                          }}
                        >
                          <b>Nota:</b> {piatto.nota}
                        </div>
                      ) : null}

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                        {piatto.stato !== "pending" && piatto.stato !== "served" && piatto.stato !== "cancelled" ? (
                          <button
                            onClick={() => riportaIndietro(piatto.orderId, piatto.stato)}
                            disabled={updating}
                            style={{
                              flex: 1,
                              border: "none",
                              borderRadius: 12,
                              padding: "11px 12px",
                              background: "#e5e7eb",
                              color: "#111827",
                              fontWeight: 900,
                              cursor: "pointer",
                              opacity: updating ? 0.7 : 1,
                            }}
                          >
                            Indietro
                          </button>
                        ) : null}

                        {piatto.stato !== "ready" && piatto.stato !== "served" && piatto.stato !== "cancelled" ? (
                          <button
                            onClick={() => cambiaStato(piatto.orderId, piatto.stato)}
                            disabled={updating}
                            style={{
                              flex: 1,
                              border: "none",
                              borderRadius: 12,
                              padding: "11px 12px",
                              background: "#111827",
                              color: "white",
                              fontWeight: 900,
                              cursor: "pointer",
                              opacity: updating ? 0.7 : 1,
                            }}
                          >
                            {testoProssimoStep(piatto.stato)}
                          </button>
                        ) : null}

                        {piatto.stato === "ready" ? (
                          <button
                            onClick={() => segnaServito(piatto.orderId)}
                            disabled={updating}
                            style={{
                              flex: 1,
                              border: "none",
                              borderRadius: 12,
                              padding: "11px 12px",
                              background: "#0891b2",
                              color: "white",
                              fontWeight: 900,
                              cursor: "pointer",
                              opacity: updating ? 0.7 : 1,
                            }}
                          >
                            Servito
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Bar;