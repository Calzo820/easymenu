import { Link } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";

const WHATSAPP_NUMBER = "3240467723";
const WHATSAPP_MESSAGE = "Ciao, voglio capire quanto EasyMenu può aumentare margine e velocità nel mio ristorante.";
const whatsappUrl = `https://wa.me/39${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const roiMetrics = [
  { value: "-35%", label: "errori evitabili tra sala, cucina e cassa" },
  { value: "+18%", label: "scontrino medio con upsell guidato" },
  { value: "+1", label: "turno tavolo recuperabile nelle fasce di picco" },
  { value: "<7 min", label: "ordine ricevuto e smistato senza passaggi manuali" },
];

const outcomes = [
  ["Servi più tavoli con lo stesso personale", "Il cliente ordina dal QR, cucina e bar ricevono subito la comanda e la sala interviene solo dove genera valore."],
  ["Riduci errori e piatti rifatti", "Note, varianti, stato ordine e tavolo sono tracciati in un unico flusso: meno telefonate interne, meno foglietti, meno incomprensioni."],
  ["Aumenti margine per coperto", "Il menu può spingere piatti ad alto margine, extra, bevande e dessert nel momento giusto."],
  ["Misuri cosa rende davvero", "Dashboard orientata a coperti, tempi di servizio, venduto per categoria, tavoli lenti ed errori ricorrenti."],
];

const integrations = ["SumUp", "Nexi", "Fatture in Cloud", "Tilby", "Cassa in Cloud", "TheFork", "Deliveroo", "Glovo"];

const pricingPlans = [
  ["Mensile", "49,99 EUR/mese + IVA", "Beta assistita, rinnovo mensile e disdetta dal portale Stripe."],
  ["Trimestrale", "134,99 EUR/3 mesi + IVA", "Per testare EasyMenu su una stagione breve con supporto incluso."],
  ["Semestrale", "254,99 EUR/6 mesi + IVA", "Il piano piu equilibrato per stabilizzare menu, QR e operativita."],
  ["Annuale", "449,99 EUR/anno + IVA", "Miglior prezzo per chi vuole partire con continuita."],
];

function Card({ children, className = "" }) {
  return <div className={`landing-card ${className}`}>{children}</div>;
}

export default function Landing() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <nav className="landing-nav">
          <div className="landing-brand">
            <img src={logoEasyMenu} alt="EasyMenu" />
            <span>EasyMenu</span>
          </div>
          <div className="landing-nav-actions">
            <Link to="/demo">Demo</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/login">Login</Link>
            <a className="landing-nav-cta" href={whatsappUrl} target="_blank" rel="noreferrer">Analisi ROI</a>
          </div>
        </nav>

        <div className="landing-hero-grid">
          <div>
            <div className="landing-eyebrow">QR ordering + sala + cucina + cassa, pensato per margine e velocità</div>
            <h1>Riduci gli errori di sala e servi più tavoli con lo stesso personale.</h1>
            <p className="landing-lead">
              EasyMenu non vende “un menu digitale”: aiuta il ristoratore a tagliare tempi morti, comande sbagliate e passaggi manuali che bruciano margine ogni sera.
            </p>
            <div className="landing-cta-row">
              <a className="landing-primary" href={whatsappUrl} target="_blank" rel="noreferrer">Calcola il ROI del locale</a>
              <Link className="landing-secondary" to="/demo">Guarda demo pubblica</Link>
            </div>
            <p className="landing-proof">Posizionamento aggiornato: prima risultati economici, poi software.</p>
          </div>

          <Card className="landing-roi-panel">
            <span className="landing-panel-label">ROI operativo</span>
            <h2>Ogni comanda deve aumentare margine, non lavoro.</h2>
            <div className="landing-metrics">
              {roiMetrics.map((metric) => (
                <div className="landing-metric" key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-title">
          <span>Perché cambiare software</span>
          <h2>La differenza non è avere un QR. È far guadagnare di più il ristorante.</h2>
        </div>
        <div className="landing-grid-4">
          {outcomes.map(([title, text]) => (
            <Card key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="landing-section landing-pricing-section">
        <div className="landing-section-title">
          <span>Prezzi chiari</span>
          <h2>EasyMenu parte da 49,99 EUR/mese + IVA.</h2>
          <p>Tutti i piani includono menu QR, cucina, bar, cassa, tavoli, report, onboarding e portale Stripe per fatture, metodo di pagamento e disdetta.</p>
        </div>
        <div className="landing-pricing-grid">
          {pricingPlans.map(([title, price, text]) => (
            <Card key={title} className={title === "Semestrale" ? "landing-price-card featured" : "landing-price-card"}>
              <span>{title}</span>
              <strong>{price}</strong>
              <p>{text}</p>
            </Card>
          ))}
        </div>
        <div className="landing-beta-box">
          <div>
            <span>Beta assistita</span>
            <h3>Ti attivo EasyMenu nel tuo ristorante per 30 giorni.</h3>
            <p>Setup guidato, QR tavoli, menu, cucina, cassa e prima prova servizio insieme. Se funziona per il locale, continui dal piano mensile.</p>
          </div>
          <a className="landing-primary" href={whatsappUrl} target="_blank" rel="noreferrer">Prenota beta assistita</a>
        </div>
      </section>

      <section className="landing-section landing-contrast">
        <div>
          <span className="landing-section-kicker">Mercato competitivo</span>
          <h2>Contro GloriaFood, MenuDino, Dishup, Menoo e POS generici serve una promessa più forte.</h2>
          <p>
            EasyMenu viene riposizionato come “restaurant growth operating system”: ordini, cassa, analytics, upsell e integrazioni. L’obiettivo non è sostituire un menu: è aumentare coperti, margine e controllo operativo.
          </p>
        </div>
        <div className="landing-comparison">
          <div><strong>Software classico</strong><span>QR, dashboard, statistiche, gestione tavoli.</span></div>
          <div><strong>EasyMenu Growth</strong><span>meno errori, più velocità, upsell, KPI ROI e integrazioni strategiche.</span></div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-title">
          <span>Integrazioni strategiche</span>
          <h2>Roadmap integrata per farlo entrare nel flusso reale del ristorante.</h2>
          <p>Ho aggiunto una base tecnica e una roadmap: senza credenziali e partnership API non si può dichiarare un’integrazione “vera”, ma ora il prodotto espone chiaramente priorità, stato e prossimi connettori.</p>
        </div>
        <div className="landing-integration-cloud">
          {integrations.map((name) => <span key={name}>{name}</span>)}
        </div>
        <div className="landing-cta-row center">
          <Link className="landing-secondary" to="/integrazioni">Vedi stato integrazioni</Link>
          <a className="landing-primary" href={whatsappUrl} target="_blank" rel="noreferrer">Prenota audit ristorante</a>
        </div>
      </section>

      <section className="landing-section landing-final">
        <h2>Il messaggio è cambiato: non “gestisci il ristorante”, ma “guadagni più margine con meno attrito”.</h2>
        <p>La prossima evoluzione concreta è implementare connettori reali, upsell AI e report ROI per tavolo.</p>
      </section>
    </main>
  );
}
