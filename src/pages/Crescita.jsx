import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import GrowthCard from "../components/growth/GrowthCard";
import { apiGet } from "../lib/api";
import { euro, oneDecimal, num } from "../lib/growthFormat";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";

function Bar({ label, value, max, detail }) {
  const width = max > 0 ? Math.max(5, Math.min(100, (num(value) / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontWeight: 900 }}>
        <span>{label}</span>
        <span style={{ color: "#475569" }}>{detail}</span>
      </div>
      <div style={{ height: 11, borderRadius: 999, background: "#eef2ff", overflow: "hidden", marginTop: 8 }}>
        <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#1d4ed8,#22c55e)" }} />
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section style={{ background: "rgba(255,255,255,.94)", border: "1px solid #dbeafe", borderRadius: 28, padding: 22, boxShadow: "0 18px 55px rgba(15,23,42,.08)" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, color: "#0f172a", letterSpacing: "-.035em" }}>{title}</h2>
        {subtitle ? <p style={{ margin: "7px 0 0", color: "#64748b", lineHeight: 1.55 }}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }) {
  return <div style={{ border: "1px dashed #cbd5e1", borderRadius: 18, padding: 18, color: "#64748b", fontWeight: 800 }}>{text}</div>;
}

export default function Crescita() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("30");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - Number(range));
      const query = `?from=${from.toISOString()}&to=${to.toISOString()}`;
      const result = await apiGet(`/commercial/growth${query}`);
      setData(result);
      setError("");
    } catch (err) {
      setError(err.message || "Errore caricamento crescita commerciale");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const score = data?.scorecard || {};
  const bestHourMax = useMemo(() => Math.max(1, ...(data?.bestHours || []).map((h) => num(h.revenue))), [data]);
  const tableMax = useMemo(() => Math.max(1, ...(data?.bestTables || []).map((t) => num(t.revenue))), [data]);
  const categoryMax = useMemo(() => Math.max(1, ...(data?.categories || []).map((c) => num(c.revenue))), [data]);

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <main style={appShellStyle}>
        <div className="app-shell">
          <header className="glass-hero" style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div className="topbar-chip" style={{ marginBottom: 12 }}>🚀 Commercial impact cockpit</div>
                <h1 style={{ margin: 0, fontSize: "clamp(34px,5vw,58px)", lineHeight: 1, letterSpacing: "-.06em" }}>Crescita ristorante</h1>
                <p style={{ margin: "14px 0 0", maxWidth: 820, color: "rgba(255,255,255,.88)", fontSize: 17, lineHeight: 1.65 }}>Trasforma i dati operativi in decisioni vendibili: cosa spingere, quando prepararsi, quali tavoli valgono di più e quali prodotti migliorare.</p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select value={range} onChange={(e) => setRange(e.target.value)} style={controlStyle}>
                  <option value="7">Ultimi 7 giorni</option>
                  <option value="30">Ultimi 30 giorni</option>
                  <option value="90">Ultimi 90 giorni</option>
                </select>
                <button onClick={load} style={buttonStyle}>{loading ? "Aggiorno..." : "Aggiorna"}</button>
              </div>
            </div>
          </header>

          {error ? <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 18, padding: 16, marginBottom: 18, fontWeight: 850 }}>{error}</div> : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginBottom: 18 }}>
            <GrowthCard title="Incasso analizzato" value={euro(score.revenue)} note={`${score.paidOrders || 0} ordini monetizzati`} tone="dark" />
            <GrowthCard title="Ticket medio" value={euro(score.averageTicket)} note="Valore da aumentare con extra e bundle" tone="green" />
            <GrowthCard title="Articoli per ordine" value={oneDecimal(score.itemsPerPaidOrder)} note="Indice di upsell reale" tone="blue" />
            <GrowthCard title="Menu dormiente" value={score.inactiveMenuItems || 0} note="Prodotti presenti ma non venduti" tone={(score.inactiveMenuItems || 0) ? "amber" : "green"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18, alignItems: "start", marginBottom: 18 }} className="growth-grid">
            <Section title="Azioni prioritarie" subtitle="Le mosse più concrete per aumentare incasso e percezione premium.">
              {(data?.actions || []).length ? data.actions.map((action) => (
                <div key={action.priority} style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 14, padding: "14px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 16, background: "#0f172a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 1000 }}>{action.priority}</div>
                  <div>
                    <div style={{ fontWeight: 1000, fontSize: 18, color: "#0f172a" }}>{action.title}</div>
                    <div style={{ color: "#64748b", lineHeight: 1.55, marginTop: 5 }}>{action.reason}</div>
                    <div style={{ marginTop: 9, fontWeight: 900, color: "#1d4ed8" }}>Prossimo step: {action.nextStep}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={pill}>Impatto {action.impact}</span>
                      <span style={pill}>Sforzo {action.effort}</span>
                    </div>
                  </div>
                </div>
              )) : <Empty text="Servono più ordini per generare azioni affidabili." />}
            </Section>

            <Section title="Script upsell" subtitle="Frasi operative da dare a camerieri/cassa.">
              {(data?.upsell || []).map((item) => (
                <div key={`${item.trigger}-${item.offer}`} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 18, padding: 15, marginBottom: 12 }}>
                  <div style={{ fontWeight: 1000, color: "#0f172a" }}>{item.trigger} → {item.offer}</div>
                  <div style={{ color: "#475569", marginTop: 7, lineHeight: 1.55 }}>{item.script}</div>
                  <div style={{ color: "#16a34a", fontWeight: 1000, marginTop: 8 }}>{item.expectedLift}</div>
                </div>
              ))}
            </Section>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, alignItems: "start", marginBottom: 18 }} className="growth-grid-three">
            <Section title="Ore migliori" subtitle="Quando il ristorante genera più valore.">
              {(data?.bestHours || []).length ? data.bestHours.map((h) => <Bar key={h.hour} label={h.label} value={h.revenue} max={bestHourMax} detail={`${h.orders} ordini · ${euro(h.revenue)}`} />) : <Empty text="Nessuna fascia oraria disponibile." />}
            </Section>
            <Section title="Tavoli più profittevoli" subtitle="Dove conviene concentrare gruppi e clienti alto valore.">
              {(data?.bestTables || []).length ? data.bestTables.map((t) => <Bar key={t.id} label={t.label} value={t.revenue} max={tableMax} detail={`${t.orders} · ${euro(t.revenue)}`} />) : <Empty text="Nessun tavolo monetizzato." />}
            </Section>
            <Section title="Categorie forti" subtitle="Dove nasce il fatturato del menu.">
              {(data?.categories || []).length ? data.categories.map((c) => <Bar key={c.category} label={c.category} value={c.revenue} max={categoryMax} detail={`${c.quantity} pz · ${euro(c.revenue)}`} />) : <Empty text="Nessuna categoria venduta." />}
            </Section>
          </div>

          <Section title="Menu engineering" subtitle="Classifica prodotti: cosa evidenziare, cosa aumentare, cosa riposizionare.">
            {(data?.menuEngineering || []).length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#64748b", fontSize: 13 }}>
                      <th style={th}>Prodotto</th><th style={th}>Categoria</th><th style={th}>Venduti</th><th style={th}>Incasso</th><th style={th}>Quadrante</th><th style={th}>Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.menuEngineering.map((p) => (
                      <tr key={p.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={td}><b>{p.name}</b></td>
                        <td style={td}>{p.category}</td>
                        <td style={td}>{p.quantity}</td>
                        <td style={td}>{euro(p.revenue)}</td>
                        <td style={td}><span style={pill}>{p.quadrant}</span></td>
                        <td style={{ ...td, color: "#475569" }}>{p.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty text="Servono vendite per creare il menu engineering." />}
          </Section>
        </div>
      </main>
      <style>{`@media(max-width:980px){.growth-grid,.growth-grid-three{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

const controlStyle = { border: "1px solid rgba(255,255,255,.22)", background: "rgba(255,255,255,.14)", color: "white", borderRadius: 16, padding: "13px 14px", fontWeight: 900, outline: "none" };
const buttonStyle = { border: "none", background: "white", color: "#123b6b", borderRadius: 16, padding: "13px 18px", fontWeight: 1000, cursor: "pointer" };
const pill = { display: "inline-flex", borderRadius: 999, padding: "6px 10px", background: "#eef2ff", color: "#1d4ed8", fontWeight: 950, fontSize: 12 };
const th = { padding: "10px 12px", borderBottom: "1px solid #e2e8f0" };
const td = { padding: "13px 12px", verticalAlign: "top" };
