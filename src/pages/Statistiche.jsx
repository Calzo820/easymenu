import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiGet } from "../lib/api";
import { glowPageStyle, appShellStyle } from "../styles/pageStyles";
import "../styles/management-os.css";

function getRistoranteAttivo() {
  return localStorage.getItem("ristorante_attivo") || "";
}

function storicoKey(nome) {
  return `storico_${nome}`;
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatEuro(value) {
  return `€ ${parseNumber(value).toFixed(2)}`;
}

function mapOrderToLegacy(order) {
  return {
    ...order,
    tavolo: order?.table?.name || order?.table?.code || order?.table?.number || order?.tavolo || "-",
    pagamento: order?.paymentMethod || order?.pagamento || "Non indicato",
    totale: order?.totalAmount ?? order?.totale ?? 0,
    chiusoIl: order?.closedAt || order?.servedAt || order?.updatedAt || order?.chiusoIl || order?.time,
    time: order?.createdAt || order?.time || Date.now(),
    piatti: (order?.items || order?.piatti || []).map((item) => ({
      ...item,
      nome: item?.nameSnapshot || item?.nome || item?.menuItem?.name || "Articolo",
      qty: item?.quantity ?? item?.qty ?? 1,
      prezzo: item?.priceSnapshot ?? item?.prezzo ?? 0,
      categoria: item?.categorySnapshot || item?.categoria || item?.menuItem?.category || "Altro",
    })),
  };
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function Stat({ label, value }) {
  return <div className="management-stat"><span>{label}</span><strong>{value}</strong></div>;
}

function BarRow({ label, value, max, suffix = "" }) {
  const width = max > 0 ? Math.max(5, Math.round((value / max) * 100)) : 0;
  return (
    <div className="report-bar-row">
      <div>
        <div className="management-row-title" style={{ fontSize: 14 }}>{label}</div>
        <div className="report-track"><div className="report-fill" style={{ width: `${width}%` }} /></div>
      </div>
      <strong>{value}{suffix}</strong>
    </div>
  );
}

export default function Statistiche() {
  const [storico, setStorico] = useState([]);
  const [periodo, setPeriodo] = useState("30");
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
    const timer = setInterval(syncStorico, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ristoranteAttivo]);

  const storicoFiltrato = useMemo(() => {
    const days = parseNumber(periodo) || 30;
    const minDate = startOfDay(new Date());
    minDate.setDate(minDate.getDate() - (days - 1));
    return [...storico]
      .filter((ordine) => {
        const ts = ordine.chiusoIl || ordine.time;
        return ts && new Date(ts) >= minDate;
      })
      .sort((a, b) => new Date(b.chiusoIl || b.time) - new Date(a.chiusoIl || a.time));
  }, [storico, periodo]);

  const incassoTotale = storicoFiltrato.reduce((acc, ordine) => acc + parseNumber(ordine.totale), 0);
  const ordiniTotali = storicoFiltrato.length;
  const ticketMedio = ordiniTotali > 0 ? incassoTotale / ordiniTotali : 0;
  const articoliVenduti = storicoFiltrato.reduce((acc, ordine) => acc + (ordine.piatti || []).reduce((sum, p) => sum + parseNumber(p.qty || 0), 0), 0);

  const piattiTop = useMemo(() => {
    const map = new Map();
    storicoFiltrato.forEach((ordine) => {
      (ordine.piatti || []).forEach((piatto) => {
        const nome = String(piatto.nome || "Sconosciuto");
        map.set(nome, (map.get(nome) || 0) + parseNumber(piatto.qty || 0));
      });
    });
    return [...map.entries()].map(([nome, qty]) => ({ nome, qty })).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [storicoFiltrato]);

  const pagamentiTop = useMemo(() => {
    const map = new Map();
    storicoFiltrato.forEach((ordine) => {
      const metodo = String(ordine.pagamento || "Non indicato");
      map.set(metodo, (map.get(metodo) || 0) + 1);
    });
    return [...map.entries()].map(([metodo, count]) => ({ metodo, count })).sort((a, b) => b.count - a.count);
  }, [storicoFiltrato]);

  const dailyRevenue = useMemo(() => {
    const map = new Map();
    storicoFiltrato.forEach((ordine) => {
      const d = new Date(ordine.chiusoIl || ordine.time).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
      map.set(d, (map.get(d) || 0) + parseNumber(ordine.totale));
    });
    return [...map.entries()].map(([day, value]) => ({ day, value })).reverse().slice(-10);
  }, [storicoFiltrato]);

  const maxDish = Math.max(...piattiTop.map((p) => p.qty), 0);
  const maxRevenue = Math.max(...dailyRevenue.map((d) => d.value), 0);
  const maxPayment = Math.max(...pagamentiTop.map((p) => p.count), 0);

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div style={appShellStyle}>
        <div className="app-shell management-os">
          <div className="management-hero-main">
            <div className="management-kicker">Report</div>
            <h1 className="management-hero-title">Numeri leggibili, decisioni veloci.</h1>
            <p className="management-hero-subtitle">
              Niente grafici inutili: incasso, ticket medio, prodotti top e metodi di pagamento in una schermata chiara.
            </p>
          </div>

          <div className="management-card">
            <div className="management-section-head">
              <div>
                <h2 className="management-title">Performance {ristoranteAttivo || "ristorante"}</h2>
                <p className="management-subtitle">Periodo selezionato: ultimi {periodo} giorni.</p>
              </div>
              <div className="management-row">
                {["7", "30", "90"].map((days) => (
                  <button key={days} className={`management-btn ${periodo === days ? "" : "secondary"}`} type="button" onClick={() => setPeriodo(days)}>{days} giorni</button>
                ))}
              </div>
            </div>
            <div className="management-stats">
              <Stat label="Incasso" value={formatEuro(incassoTotale)} />
              <Stat label="Ordini" value={ordiniTotali} />
              <Stat label="Ticket medio" value={formatEuro(ticketMedio)} />
              <Stat label="Articoli" value={articoliVenduti} />
            </div>
          </div>

          {storicoFiltrato.length === 0 ? (
            <div className="management-card">
              <h2 className="management-title">Nessun dato disponibile</h2>
              <p className="management-subtitle">Chiudi qualche conto dalla cassa e qui vedrai i report.</p>
            </div>
          ) : (
            <div className="report-simple-grid">
              <div className="management-card report-bar">
                <div className="management-section-head">
                  <div>
                    <h2 className="management-title">Incasso per giorno</h2>
                    <p className="management-subtitle">Ultimi giorni con movimento.</p>
                  </div>
                </div>
                {dailyRevenue.map((day) => <BarRow key={day.day} label={day.day} value={Number(day.value.toFixed(0))} max={maxRevenue} suffix="€" />)}
              </div>

              <div className="management-card report-bar">
                <div className="management-section-head">
                  <div>
                    <h2 className="management-title">Prodotti top</h2>
                    <p className="management-subtitle">Cosa spinge davvero il servizio.</p>
                  </div>
                </div>
                {piattiTop.map((dish) => <BarRow key={dish.nome} label={dish.nome} value={dish.qty} max={maxDish} />)}
              </div>

              <div className="management-card report-bar">
                <div className="management-section-head">
                  <div>
                    <h2 className="management-title">Pagamenti</h2>
                    <p className="management-subtitle">Metodo più usato nel periodo.</p>
                  </div>
                </div>
                {pagamentiTop.map((payment) => <BarRow key={payment.metodo} label={payment.metodo} value={payment.count} max={maxPayment} />)}
              </div>

              <div className="management-card">
                <h2 className="management-title">Azioni consigliate</h2>
                <div className="management-list" style={{ marginTop: 14 }}>
                  <div className="management-list-row"><div><div className="management-row-title">Controlla i prodotti top</div><div className="management-row-meta">Mettili in evidenza nel menu cliente.</div></div><button className="management-btn secondary" onClick={() => window.location.href = "/admin"}>Menu</button></div>
                  <div className="management-list-row"><div><div className="management-row-title">Verifica ticket medio</div><div className="management-row-meta">Se è basso, spingi combo, dolci o bevande.</div></div><span className="management-badge">{formatEuro(ticketMedio)}</span></div>
                  <div className="management-list-row"><div><div className="management-row-title">Scarica storico completo</div><div className="management-row-meta">Per analisi avanzate usa lo storico ordini.</div></div><button className="management-btn secondary" onClick={() => window.location.href = "/storico"}>Storico</button></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
