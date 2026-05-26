import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiGet } from "../lib/api";
import { appShellStyle, glowPageStyle } from "../styles/pageStyles";
import { ActionCard, MetricCard, PeakHours, ProductPowerList, TableRanking } from "../components/commercial/CommercialImpactCards";
import { buildUpsellScripts, formatCurrency, getScoreLabel } from "../lib/commercialImpact";
import "../styles/commercial-impact.css";

const periods = [
  { label: "7 giorni", value: 7 },
  { label: "30 giorni", value: 30 },
  { label: "90 giorni", value: 90 },
];

function getFromDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default function CommercialImpact() {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiGet(`/analytics/commercial-impact?from=${encodeURIComponent(getFromDate(period))}`);
      setData(result);
      setError("");
    } catch (err) {
      setError(err.message || "Errore caricamento impatto commerciale");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary || {};
  const scripts = useMemo(() => buildUpsellScripts(data?.topProducts || []), [data?.topProducts]);

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <main style={appShellStyle}>
        <div className="app-shell commercial-impact-page">
          <section className="commercial-hero">
            <div>
              <div className="commercial-eyebrow">Revenue Operating System</div>
              <h1>Crescita commerciale</h1>
              <p>
                Una schermata pensata per vendere il valore del SaaS al ristoratore: cosa spingere, quando spingerlo,
                quali tavoli rendono di più e quali azioni fare subito per aumentare incassi e velocità.
              </p>
            </div>

            <div className="commercial-score-card">
              <span>Commercial score</span>
              <strong>{data?.score ?? "--"}</strong>
              <small>{data ? getScoreLabel(data.score) : "Analisi in caricamento"}</small>
            </div>
          </section>

          <div className="commercial-toolbar">
            <div>
              <strong>Periodo analisi</strong>
              <small>Usa periodi brevi per decisioni operative, lunghi per strategia menu.</small>
            </div>
            <div className="commercial-periods">
              {periods.map((item) => (
                <button key={item.value} className={period === item.value ? "active" : ""} onClick={() => setPeriod(item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error ? <div className="commercial-error">{error}</div> : null}
          {loading ? <div className="commercial-loading">Caricamento analisi commerciale...</div> : null}

          <section className="commercial-metrics">
            <MetricCard label="Fatturato periodo" value={formatCurrency(summary.revenue)} note={`${summary.paidOrders || 0} ordini monetizzati`} accent="green" />
            <MetricCard label="Ticket medio" value={formatCurrency(summary.averageTicket)} note="leva principale upsell" accent="blue" />
            <MetricCard label="Tempo cucina" value={summary.averageKitchenMinutes ? `${summary.averageKitchenMinutes} min` : "n/d"} note="impatta rotazione tavoli" accent="orange" />
            <MetricCard label="Menu attivo" value={`${summary.menuItems || 0}`} note={`${summary.unavailableItems || 0} non disponibili`} accent="purple" />
          </section>

          <section className="commercial-grid two">
            <div className="commercial-panel">
              <div className="commercial-panel-head">
                <span>Azioni prioritarie</span>
                <small>Checklist concreta per aumentare vendite e percezione premium.</small>
              </div>
              <div className="commercial-actions">
                {(data?.actions || []).length ? data.actions.map((action, index) => <ActionCard key={`${action.type}-${index}`} action={action} index={index} />) : <div className="commercial-empty">Servono più ordini per generare raccomandazioni affidabili.</div>}
              </div>
            </div>

            <div className="commercial-panel dark">
              <div className="commercial-panel-head">
                <span>Script upsell staff</span>
                <small>Frasi pronte da usare in sala senza rallentare il servizio.</small>
              </div>
              <div className="commercial-script-list">
                {scripts.map((script) => (
                  <article key={script.title}>
                    <strong>{script.title}</strong>
                    <p>“{script.script}”</p>
                    <small>{script.target}</small>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="commercial-grid three">
            <div className="commercial-panel wide">
              <div className="commercial-panel-head">
                <span>Menu engineering</span>
                <small>Prodotti da mettere in alto, proporre in combo o usare come gancio.</small>
              </div>
              <ProductPowerList products={data?.topProducts || []} />
            </div>

            <div className="commercial-panel">
              <div className="commercial-panel-head">
                <span>Orari migliori</span>
                <small>Picchi dove preparazione e staff generano più ricavi.</small>
              </div>
              <PeakHours hours={data?.peakHours || []} />
            </div>

            <div className="commercial-panel">
              <div className="commercial-panel-head">
                <span>Tavoli più profittevoli</span>
                <small>Aiuta layout sala, priorità servizio e rotazione.</small>
              </div>
              <TableRanking tables={data?.tablePerformance || []} />
            </div>
          </section>

          <section className="commercial-playbook">
            <div>
              <span>Playbook settimanale</span>
              <h2>Come venderlo al ristoratore</h2>
              <p>Mostra questa pagina in demo: non parla di “gestione ordini”, parla di più incassi, meno errori e decisioni più rapide.</p>
            </div>
            <ol>
              <li>Apri la dashboard davanti al titolare e parti dal ticket medio.</li>
              <li>Mostra il prodotto top e proponi una combo automatica.</li>
              <li>Mostra la fascia oraria migliore e collega il valore alla stampa/KDS.</li>
              <li>Chiudi con azioni prioritarie: sono il motivo per cui pagare ogni mese.</li>
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
}
