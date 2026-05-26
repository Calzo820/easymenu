import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import CommandDock from "../components/CommandDock";
import { apiGet } from "../lib/api";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";

function getRistoranteAttivo() {
  return localStorage.getItem("ristorante_attivo") || "";
}

function storicoKey(nome) {
  return `storico_${nome}`;
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

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatEuro(value) {
  return `€ ${parseNumber(value).toFixed(2)}`;
}

function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("it-IT");
}

function sameDay(a, b) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildDaysRange(days) {
  const today = new Date();
  const range = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    range.push(startOfDay(d));
  }

  return range;
}

function getPeriodoLabel(periodo) {
  if (periodo === "7") return "Ultimi 7 giorni";
  if (periodo === "30") return "Ultimi 30 giorni";
  if (periodo === "90") return "Ultimi 90 giorni";
  return "Ultimi 30 giorni";
}

function StatCard({ label, value, badge }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-badge">{badge}</div>
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="section-card">
      <div className="panel-title">{title}</div>
      <div className="panel-subtitle">{subtitle}</div>
    </div>
  );
}

function XYLineChart({ data, onPointClick, selectedIndex }) {
  const width = 1000;
  const height = 320;
  const paddingTop = 24;
  const paddingRight = 28;
  const paddingBottom = 42;
  const paddingLeft = 58;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  const safeMax = maxValue <= 0 ? 10 : Math.ceil(maxValue * 1.15);

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((safeMax / yTicks) * i)
  );

  function xFor(index) {
    if (data.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * innerWidth;
  }

  function yFor(value) {
    return paddingTop + innerHeight - (value / safeMax) * innerHeight;
  }

  const points = data.map((item, index) => ({
    ...item,
    x: xFor(index),
    y: yFor(item.value),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          minWidth: 760,
          height: "auto",
          display: "block",
        }}
      >
        <rect x="0" y="0" width={width} height={height} rx="18" fill="#ffffff" />

        {tickValues.map((tick, index) => {
          const y = yFor(tick);

          return (
            <g key={`tick-${index}`}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#64748b"
                fontWeight="700"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={height - paddingBottom}
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

        <text
          x={paddingLeft - 34}
          y={paddingTop - 4}
          fontSize="12"
          fill="#334155"
          fontWeight="800"
        >
          Y
        </text>

        <text
          x={width - paddingRight + 8}
          y={height - paddingBottom + 4}
          fontSize="12"
          fill="#334155"
          fontWeight="800"
        >
          X
        </text>

        {points.map((point, index) => (
          <text
            key={`xlabel-${index}`}
            x={point.x}
            y={height - paddingBottom + 20}
            textAnchor="middle"
            fontSize="11"
            fill="#64748b"
            fontWeight="700"
          >
            {point.shortLabel}
          </text>
        ))}

        {points.length > 1 ? (
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : points.length === 1 ? (
          <line
            x1={points[0].x}
            y1={points[0].y}
            x2={points[0].x}
            y2={height - paddingBottom}
            stroke="#2563eb"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ) : null}

        {points.map((point, index) => (
          <g key={`point-${index}`} onClick={() => onPointClick(index)} style={{ cursor: "pointer" }}>
            <circle
              cx={point.x}
              cy={point.y}
              r={selectedIndex === index ? 8 : 6}
              fill={selectedIndex === index ? "#111827" : "#2563eb"}
              stroke="#ffffff"
              strokeWidth="3"
            />

            {selectedIndex === index ? (
              <>
                <rect
                  x={point.x - 62}
                  y={point.y - 48}
                  width="124"
                  height="32"
                  rx="10"
                  fill="#111827"
                />
                <text
                  x={point.x}
                  y={point.y - 27}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#ffffff"
                  fontWeight="800"
                >
                  {formatEuro(point.value)}
                </text>
              </>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function Statistiche() {
  const [storico, setStorico] = useState([]);
  const [periodo, setPeriodo] = useState("30");
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);

  const ristoranteAttivo = getRistoranteAttivo();

  useEffect(() => {
    let cancelled = false;

    async function syncStorico() {
      if (!ristoranteAttivo) {
        setStorico([]);
        return;
      }

      try {
        const data = await apiGet("/orders?history=true");
        const lista = Array.isArray(data) ? data : data?.orders || [];
        if (!cancelled) setStorico(lista.map(mapOrderToLegacy));
      } catch (error) {
        console.warn("Backend non disponibile, uso storico locale", error);
        const dati = JSON.parse(localStorage.getItem(storicoKey(ristoranteAttivo)) || "[]");
        if (!cancelled) setStorico(Array.isArray(dati) ? dati : []);
      }
    }

    syncStorico();

    const timer = setInterval(syncStorico, 5000);
    const onStorage = () => syncStorico();

    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [ristoranteAttivo]);

  const storicoFiltrato = useMemo(() => {
    const days = parseNumber(periodo) || 30;
    const now = new Date();
    const minDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)));
    const maxDate = endOfDay(now);

    return [...storico]
      .filter((ordine) => {
        const ts = ordine.chiusoIl || ordine.time;
        if (!ts) return false;
        const d = new Date(ts);
        return d >= minDate && d <= maxDate;
      })
      .sort((a, b) => (a.chiusoIl || a.time || 0) - (b.chiusoIl || b.time || 0));
  }, [storico, periodo]);

  const chartData = useMemo(() => {
    const days = parseNumber(periodo) || 30;
    const range = buildDaysRange(days);

    return range.map((day) => {
      const ordiniDelGiorno = storicoFiltrato.filter((ordine) => {
        const ts = ordine.chiusoIl || ordine.time;
        return sameDay(new Date(ts), day);
      });

      const value = ordiniDelGiorno.reduce((acc, ordine) => acc + parseNumber(ordine.totale), 0);

      return {
        date: day,
        fullLabel: day.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
        }),
        shortLabel: day.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
        }),
        value,
        orders: ordiniDelGiorno.length,
      };
    });
  }, [storicoFiltrato, periodo]);

  useEffect(() => {
    if (chartData.length > 0) {
      setSelectedPointIndex(chartData.length - 1);
    } else {
      setSelectedPointIndex(null);
    }
  }, [periodo, chartData.length]);

  const selectedPoint =
    selectedPointIndex !== null && chartData[selectedPointIndex]
      ? chartData[selectedPointIndex]
      : null;

  const incassoTotale = storicoFiltrato.reduce(
    (acc, ordine) => acc + parseNumber(ordine.totale),
    0
  );

  const ordiniTotali = storicoFiltrato.length;

  const articoliVenduti = storicoFiltrato.reduce((acc, ordine) => {
    return (
      acc +
      (ordine.piatti || []).reduce((sum, p) => sum + parseNumber(p.qty || 0), 0)
    );
  }, 0);

  const ticketMedio = ordiniTotali > 0 ? incassoTotale / ordiniTotali : 0;

  const piattiTop = useMemo(() => {
    const map = new Map();

    storicoFiltrato.forEach((ordine) => {
      (ordine.piatti || []).forEach((piatto) => {
        const nome = String(piatto.nome || "Sconosciuto");
        const current = map.get(nome) || 0;
        map.set(nome, current + parseNumber(piatto.qty || 0));
      });
    });

    return [...map.entries()]
      .map(([nome, qty]) => ({ nome, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [storicoFiltrato]);

  const pagamentiTop = useMemo(() => {
    const map = new Map();

    storicoFiltrato.forEach((ordine) => {
      const metodo = String(ordine.pagamento || "Non indicato");
      const current = map.get(metodo) || 0;
      map.set(metodo, current + 1);
    });

    return [...map.entries()]
      .map(([metodo, count]) => ({ metodo, count }))
      .sort((a, b) => b.count - a.count);
  }, [storicoFiltrato]);

  const giornoMigliore = useMemo(() => {
    if (chartData.length === 0) return null;
    return [...chartData].sort((a, b) => b.value - a.value)[0];
  }, [chartData]);

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <CommandDock mode="owner" />

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
                  <span className="status-dot" style={{ background: "#2563eb" }} />
                  Statistiche
                </div>
                <h1 style={{ margin: 0, fontSize: 34 }}>Statistiche con grafico X/Y</h1>
                <p style={{ marginTop: 10, opacity: 0.9 }}>
                  {ristoranteAttivo || "Nessun ristorante attivo"} — asse X giorni, asse Y incasso
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => setPeriodo("7")}
                  style={periodButton(periodo === "7")}
                >
                  7 giorni
                </button>
                <button
                  onClick={() => setPeriodo("30")}
                  style={periodButton(periodo === "30")}
                >
                  30 giorni
                </button>
                <button
                  onClick={() => setPeriodo("90")}
                  style={periodButton(periodo === "90")}
                >
                  90 giorni
                </button>
              </div>
            </div>
          </div>

          {storico.length === 0 ? (
            <EmptyState
              title="Nessun dato disponibile"
              subtitle="Chiudi qualche conto dalla cassa e qui vedrai grafico e statistiche."
            />
          ) : (
            <>
              <div
                className="os-grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  marginBottom: 16,
                }}
              >
                <StatCard
                  label="Incasso totale"
                  value={formatEuro(incassoTotale)}
                  badge={getPeriodoLabel(periodo)}
                />
                <StatCard
                  label="Ordini"
                  value={String(ordiniTotali)}
                  badge="chiusi"
                />
                <StatCard
                  label="Ticket medio"
                  value={formatEuro(ticketMedio)}
                  badge="per ordine"
                />
                <StatCard
                  label="Articoli venduti"
                  value={String(articoliVenduti)}
                  badge="totali"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 0.9fr",
                  gap: 16,
                  marginBottom: 16,
                  alignItems: "start",
                }}
              >
                <div className="section-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div className="panel-title">Grafico incasso X/Y</div>
                      <div className="panel-subtitle">
                        Tocca un punto per vedere il valore del giorno
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderRadius: 999,
                        padding: "8px 12px",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      X = giorni · Y = euro
                    </div>
                  </div>

                  <XYLineChart
                    data={chartData}
                    selectedIndex={selectedPointIndex}
                    onPointClick={setSelectedPointIndex}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 16,
                  }}
                >
                  <div className="section-card">
                    <div className="panel-title">Dettaglio punto selezionato</div>
                    {selectedPoint ? (
                      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Data</div>
                          <div style={infoValueStyle}>
                            {selectedPoint.date.toLocaleDateString("it-IT")}
                          </div>
                        </div>

                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Incasso</div>
                          <div style={infoValueStyle}>{formatEuro(selectedPoint.value)}</div>
                        </div>

                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Ordini</div>
                          <div style={infoValueStyle}>{selectedPoint.orders}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="panel-subtitle" style={{ marginTop: 12 }}>
                        Nessun punto selezionato.
                      </div>
                    )}
                  </div>

                  <div className="section-card">
                    <div className="panel-title">Miglior giorno</div>
                    {giornoMigliore ? (
                      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Data</div>
                          <div style={infoValueStyle}>
                            {formatDate(giornoMigliore.date)}
                          </div>
                        </div>

                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Incasso</div>
                          <div style={infoValueStyle}>
                            {formatEuro(giornoMigliore.value)}
                          </div>
                        </div>

                        <div style={infoBoxStyle}>
                          <div style={infoLabelStyle}>Ordini</div>
                          <div style={infoValueStyle}>{giornoMigliore.orders}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="panel-subtitle" style={{ marginTop: 12 }}>
                        Nessun dato.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div className="section-card">
                  <div className="panel-title">Piatti più venduti</div>
                  <div className="panel-subtitle" style={{ marginBottom: 14 }}>
                    Classifica per quantità venduta
                  </div>

                  {piattiTop.length === 0 ? (
                    <div style={{ color: "#64748b" }}>Nessun dato disponibile.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {piattiTop.map((item, index) => (
                        <div
                          key={`${item.nome}-${index}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                            background: "#f8fafc",
                            border: "1px solid #e5e7eb",
                            borderRadius: 14,
                            padding: "12px 14px",
                          }}
                        >
                          <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "#111827",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                                fontSize: 14,
                                flexShrink: 0,
                              }}
                            >
                              {index + 1}
                            </div>

                            <div
                              style={{
                                fontWeight: 800,
                                color: "#111827",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.nome}
                            </div>
                          </div>

                          <div
                            style={{
                              background: "#dbeafe",
                              color: "#1d4ed8",
                              borderRadius: 999,
                              padding: "6px 10px",
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.qty} pz
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="section-card">
                  <div className="panel-title">Metodi di pagamento</div>
                  <div className="panel-subtitle" style={{ marginBottom: 14 }}>
                    Distribuzione ordini per pagamento
                  </div>

                  {pagamentiTop.length === 0 ? (
                    <div style={{ color: "#64748b" }}>Nessun dato disponibile.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {pagamentiTop.map((item, index) => {
                        const percentuale =
                          ordiniTotali > 0 ? Math.round((item.count / ordiniTotali) * 100) : 0;

                        return (
                          <div
                            key={`${item.metodo}-${index}`}
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e5e7eb",
                              borderRadius: 14,
                              padding: 12,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                marginBottom: 8,
                                alignItems: "center",
                              }}
                            >
                              <div style={{ fontWeight: 800, color: "#111827" }}>
                                {item.metodo}
                              </div>
                              <div style={{ color: "#475569", fontWeight: 800 }}>
                                {item.count} ordini
                              </div>
                            </div>

                            <div
                              style={{
                                height: 10,
                                borderRadius: 999,
                                background: "#e5e7eb",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${percentuale}%`,
                                  height: "100%",
                                  background: "#2563eb",
                                  borderRadius: 999,
                                }}
                              />
                            </div>

                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                color: "#64748b",
                                fontWeight: 700,
                              }}
                            >
                              {percentuale}% del totale
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function periodButton(active) {
  return {
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    background: active ? "#111827" : "#ffffff",
    color: active ? "white" : "#111827",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: active ? "0 10px 18px rgba(17,24,39,0.18)" : "0 6px 14px rgba(15,23,42,0.06)",
  };
}

const infoBoxStyle = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
};

const infoLabelStyle = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 700,
  marginBottom: 6,
};

const infoValueStyle = {
  fontSize: 20,
  color: "#111827",
  fontWeight: 900,
};

export default Statistiche;