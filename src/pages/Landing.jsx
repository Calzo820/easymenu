import { Link } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";
import restaurantServiceImage from "../assets/landing-restaurant-service-v2.jpg";

const WHATSAPP_NUMBER = "3240467723";
const WHATSAPP_MESSAGE = "Ciao, vorrei provare EasyMenu nel mio ristorante con una beta assistita.";
const whatsappUrl = `https://wa.me/39${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const serviceProof = [
  "Menu QR collegato a cucina, bar e cassa",
  "Comande tracciate per tavolo e stato",
  "Cassa e sala leggono gli stessi conti",
  "Setup assistito prima della prova reale",
];

const outcomes = [
  ["Servi più tavoli con lo stesso personale", "Il cliente ordina dal QR, cucina e bar ricevono subito la comanda e la sala interviene solo dove genera valore."],
  ["Riduci errori e piatti rifatti", "Note, varianti, stato ordine e tavolo sono tracciati in un unico flusso: meno foglietti, meno telefonate interne, meno incomprensioni."],
  ["Aumenti margine per coperto", "Il menu può valorizzare piatti ad alto margine, extra, bevande e dessert nel momento giusto."],
  ["Misuri cosa rende davvero", "Dashboard orientata a coperti, tempi di servizio, venduto per categoria, tavoli lenti ed errori ricorrenti."],
];

const integrations = ["SumUp", "Nexi", "Fatture in Cloud", "Tilby", "Cassa in Cloud", "TheFork", "Deliveroo", "Glovo"];

const pricingPlans = [
  ["Mensile", "49,99 €/mese + IVA", "Beta assistita, rinnovo mensile e disdetta dal portale Stripe."],
  ["Trimestrale", "134,99 €/3 mesi + IVA", "Per testare EasyMenu su una stagione breve con supporto incluso."],
  ["Semestrale", "254,99 €/6 mesi + IVA", "Il piano più equilibrato per stabilizzare menu, QR e operatività."],
  ["Annuale", "449,99 €/anno + IVA", "Miglior prezzo per chi vuole partire con continuità."],
];

function Card({ children, className = "" }) {
  return <div className={`landing-card ${className}`}>{children}</div>;
}

export default function Landing() {
  return (
    <main className="landing-page">
      <section
        className="landing-hero"
        style={{ "--landing-hero-image": `url(${restaurantServiceImage})` }}
      >
        <nav className="landing-nav">
          <div className="landing-brand">
            <img src={logoEasyMenu} alt="EasyMenu" />
            <span>EasyMenu</span>
          </div>
          <div className="landing-nav-actions">
            <Link to="/demo">Demo</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/login">Login</Link>
            <a className="landing-nav-cta" href={whatsappUrl} target="_blank" rel="noreferrer">Parla con noi</a>
          </div>
        </nav>

        <div className="landing-hero-content">
          <div className="landing-eyebrow">Menu QR, sala, cucina e cassa in un solo flusso</div>
          <h1>EasyMenu per ristoranti</h1>
          <p className="landing-hero-promise">Riduci gli errori di sala e gestisci più tavoli con lo stesso personale.</p>
          <p className="landing-lead">
            Dal QR del cliente alla comanda, fino al conto: ogni passaggio resta chiaro, aggiornato e collegato durante il servizio.
          </p>
          <div className="landing-cta-row">
            <a className="landing-primary" href={whatsappUrl} target="_blank" rel="noreferrer">Prenota beta assistita</a>
            <Link className="landing-secondary" to="/demo">Guarda demo pubblica</Link>
          </div>
          <p className="landing-proof">30 giorni di prova assistita, configurazione inclusa e nessun vincolo iniziale.</p>
        </div>
      </section>

      <section className="landing-service-proof" aria-label="Cosa include EasyMenu">
        {serviceProof.map((item, index) => (
          <article key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{item}</p>
          </article>
        ))}
      </section>

      <section className="landing-section">
        <div className="landing-section-title">
          <span>Perché cambiare software</span>
          <h2>La differenza non è avere un QR. È far lavorare meglio il ristorante.</h2>
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
          <h2>EasyMenu parte da 49,99 €/mese + IVA.</h2>
          <p>Tutti i piani includono menu QR, cucina, bar, cassa, tavoli, onboarding e portale Stripe per fatture, metodo di pagamento e disdetta.</p>
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
          <h2>Contro menu digitali e POS generici serve una promessa più forte.</h2>
          <p>
            EasyMenu va venduto come sistema operativo del servizio: menu, ordini, cucina, cassa, tavoli e integrazioni. L'obiettivo non è sostituire un PDF: è aumentare controllo operativo, qualità del servizio e margine misurabile nel tempo.
          </p>
        </div>
        <div className="landing-comparison">
          <div><strong>Software classico</strong><span>QR, dashboard, statistiche, gestione tavoli.</span></div>
          <div><strong>EasyMenu Growth</strong><span>Meno errori, più velocità, menu ordinato e flusso operativo unico.</span></div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-title">
          <span>Integrazioni strategiche</span>
          <h2>Roadmap integrata per entrare nel flusso reale del ristorante.</h2>
          <p>La roadmap mostra chiaramente cosa è già operativo e cosa arriva dopo: pagamenti, fiscale, POS, prenotazioni e delivery.</p>
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
        <h2>Il messaggio è semplice: gestisci meglio il servizio e costruisci margine con meno attrito.</h2>
        <p>La vendita più forte oggi è la beta assistita: installazione guidata, QR pronti, prova servizio e decisione dopo 30 giorni.</p>
      </section>
    </main>
  );
}
