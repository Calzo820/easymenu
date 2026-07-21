import { Link, useLocation } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";
import "../styles/legal.css";

const pages = {
  "/privacy": {
    eyebrow: "Privacy Policy",
    title: "Privacy Policy EasyMenu",
    intro: "Bozza pubblica da validare con consulente privacy prima della vendita definitiva.",
    sections: [
      ["Ruoli", "Il ristorante resta titolare dei dati dei propri clienti finali. EasyMenu opera come fornitore SaaS e responsabile del trattamento per hosting, supporto e funzionamento piattaforma."],
      ["Dati trattati", "Account ristorante, utenti staff, tavoli, menu, ordini, stato pagamento, log tecnici e dati necessari all'assistenza."],
      ["Superadmin", "Il superadmin vede solo nome ristorante, email owner, piano, stato abbonamento e problemi tecnici. Ordini completi, dati clienti finali e dati economici privati restano non consultabili salvo supporto motivato o consenso."],
      ["Conservazione", "I dati sono conservati per il tempo necessario a erogare il servizio, rispettare obblighi contrattuali e gestire sicurezza, billing e supporto."],
      ["Diritti privacy", "Gli interessati possono chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opposizione al trattamento. Le richieste vanno gestite dal ristorante titolare, con supporto tecnico EasyMenu quando necessario."],
      ["Contatti", "Prima della vendita inserire ragione sociale, P.IVA, indirizzo, email privacy e riferimenti del gestore EasyMenu."],
    ],
  },
  "/termini": {
    eyebrow: "Termini",
    title: "Termini e Condizioni EasyMenu",
    intro: "Condizioni operative iniziali per l'uso del SaaS EasyMenu da parte dei ristoranti.",
    sections: [
      ["Servizio", "EasyMenu include menu QR, ordini al tavolo, cucina, bar, cassa, tavoli, staff opzionale, demo e billing."],
      ["Responsabilità ristorante", "Il ristorante è responsabile di prezzi, menu, allergeni, accessi staff, obblighi fiscali e uso corretto dei QR."],
      ["Abbonamento", "I piani sono mensile, trimestrale, semestrale e annuale. Il rinnovo e automatico tramite Stripe, con gestione e disdetta dal portale abbonamento."],
      ["Prezzi", "I prezzi pubblicati sono 49,99 €/mese + IVA, 134,99 €/3 mesi + IVA, 254,99 €/6 mesi + IVA e 449,99 €/anno + IVA. Eventuali promozioni o setup assistito vanno confermati per iscritto."],
      ["Limitazioni", "EasyMenu non sostituisce consulenza fiscale, registratore telematico, HACCP o consulenza legale/privacy."],
    ],
  },
  "/cookie": {
    eyebrow: "Cookie",
    title: "Cookie Policy EasyMenu",
    intro: "Bozza cookie policy basata su uso tecnico della piattaforma.",
    sections: [
      ["Cookie tecnici", "EasyMenu può usare cookie o storage locale per sessione, autenticazione, preferenze interfaccia, carrello e stato ordine."],
      ["Analytics e marketing", "Se saranno aggiunti strumenti non tecnici serviranno consenso, scelta granulare, blocco preventivo e revoca."],
      ["Terze parti", "Stripe può usare tecnologie proprie durante checkout e portale billing secondo le proprie policy."],
      ["Stato consigliato", "Prima della vendita usare solo strumenti tecnici, evitando pixel marketing finche consenso e documentazione non sono completi."],
    ],
  },
};

export default function LegalPage() {
  const location = useLocation();
  const page = pages[location.pathname] || pages["/privacy"];

  return (
    <main className="legal-page">
      <nav className="legal-nav">
        <Link to="/" className="legal-brand">
          <img src={logoEasyMenu} alt="EasyMenu" />
          <span>EasyMenu</span>
        </Link>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/termini">Termini</Link>
          <Link to="/cookie">Cookie</Link>
        </div>
      </nav>

      <section className="legal-hero">
        <span>{page.eyebrow}</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
      </section>

      <section className="legal-sections">
        {page.sections.map(([title, text]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
