import { Link } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";

const WHATSAPP_NUMBER = "3240467723";
const WHATSAPP_MESSAGE = "Ciao, vorrei informazioni su EasyMenu per una catena o più ristoranti.";

function goToPlan(plan) {
  return `/register?next=/billing&plan=${plan}`;
}

function Card({ title, text, icon }) {
  return (
    <div style={cardStyle}>
      <div style={iconStyle}>{icon}</div>
      <h3 style={cardTitle}>{title}</h3>
      <p style={cardText}>{text}</p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div style={stepStyle}>
      <strong style={stepNumber}>{number}</strong>
      <div>
        <h3 style={{ margin: 0, color: "#0b2e59", fontSize: 18 }}>{title}</h3>
        <p style={{ margin: "6px 0 0", color: "#5a7497", lineHeight: 1.55 }}>{text}</p>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <Link to="/" style={brandStyle}>
          <span style={logoWrapStyle}>
            <img src={logoEasyMenu} alt="EasyMenu" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </span>
          <span>
            <strong style={{ display: "block", color: "#0b2e59", fontSize: 20, lineHeight: 1 }}>EasyMenu</strong>
            <small style={{ color: "#6480a6", fontWeight: 700 }}>Ordini QR per ristoranti</small>
          </span>
        </Link>

        <nav style={navStyle}>
          <a href="#come-funziona" style={navLinkStyle}>Come funziona</a>
          <a href="#prezzi" style={navLinkStyle}>Prezzi</a>
          <Link to="/login" style={outlineButtonStyle}>Accedi</Link>
          <Link to="/login" style={primarySmallStyle}>Inizia ora</Link>
        </nav>
      </header>

      <main style={mainStyle}>
        <section style={heroStyle}>
          <div>
            <div style={pillStyle}>Software semplice per ordinare dal tavolo</div>
            <h1 style={heroTitleStyle}>Il cliente scansiona il QR, ordina e lo staff lavora meglio.</h1>
            <p style={heroTextStyle}>
              EasyMenu unisce menu digitale, ordini dal tavolo, cucina, bar, cassa e gestione tavoli.
              Meno attese, meno errori, più velocità operativa.
            </p>

            <div style={buttonRowStyle}>
              <Link to="/login" style={heroPrimaryStyle}>Attiva ora</Link>
              <a href="#prezzi" style={heroSecondaryStyle}>Vedi prezzi</a>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={mutedLabelStyle}>Flusso operativo</div>
                <h2 style={{ margin: "6px 0 0", color: "#0b2e59" }}>Tavolo 12</h2>
              </div>
              <span style={statusStyle}>Live</span>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <div style={orderRowStyle}>
                <span><strong>Carbonara</strong><small> · x2 · cucina</small></span>
                <strong>€24,00</strong>
              </div>
              <div style={orderRowStyle}>
                <span><strong>Acqua frizzante</strong><small> · x2 · bar</small></span>
                <strong>€4,00</strong>
              </div>
              <div style={{ ...orderRowStyle, background: "#ecfdf5" }}>
                <span><strong>Totale tavolo</strong><small> · pronto per la cassa</small></span>
                <strong>€28,00</strong>
              </div>
            </div>
          </div>
        </section>

        <section style={compactGridStyle}>
          <Card icon="📱" title="Menu QR" text="Ogni tavolo apre il menu corretto da telefono, tablet o PC." />
          <Card icon="👨‍🍳" title="Cucina e bar" text="Gli ordini arrivano già divisi per reparto e stato." />
          <Card icon="💳" title="Cassa rapida" text="Il conto è ordinato e pronto per chiudere il tavolo." />
        </section>

        <section id="come-funziona" style={sectionStyle}>
          <div>
            <div style={pillLightStyle}>Come funziona</div>
            <h2 style={sectionTitleStyle}>Tre passaggi, senza complicazioni.</h2>
          </div>
          <div style={stepsGridStyle}>
            <Step number="1" title="Configuri il menu" text="Inserisci prodotti, prezzi, descrizioni e disponibilità." />
            <Step number="2" title="Generi i QR tavolo" text="Ogni tavolo ha solo numero e QR. Niente zone o coperti obbligatori." />
            <Step number="3" title="Ricevi ordini live" text="Cucina, bar e cassa seguono lo stesso flusso in tempo reale." />
          </div>
        </section>

        <section id="prezzi" style={sectionStyle}>
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 22px" }}>
            <div style={pillLightStyle}>Prezzi</div>
            <h2 style={sectionTitleStyle}>Un piano semplice. Una soluzione per le catene.</h2>
            <p style={sectionTextStyle}>
              Niente pacchetti confusi: EasyMenu parte da un piano unico per locale.
            </p>
          </div>

          <div style={pricingGridStyle}>
            <div style={{ ...priceCardStyle, border: "2px solid #2563eb" }}>
              <span style={recommendedStyle}>Consigliato</span>
              <h3 style={priceTitleStyle}>Ristorante</h3>
              <div style={priceStyle}>€49,99<span style={perStyle}>/mese</span></div>
              <p style={cardText}>Per ristoranti, bar, pizzerie e locali singoli.</p>
              <ul style={featureListStyle}>
                <li>Menu digitale responsive</li>
                <li>QR per tavolo</li>
                <li>Ordini live cucina/bar</li>
                <li>Cassa e storico ordini</li>
                <li>Dashboard e gestione menu</li>
              </ul>
              <Link to={goToPlan("starter")} style={fullButtonStyle}>Vai al pagamento</Link>
            </div>

            <div style={priceCardStyle}>
              <h3 style={priceTitleStyle}>Catene e gruppi</h3>
              <div style={priceStyle}>Su misura</div>
              <p style={cardText}>Per più sedi, brand con esigenze avanzate e setup dedicato.</p>
              <ul style={featureListStyle}>
                <li>Multi-ristorante</li>
                <li>Supporto configurazione</li>
                <li>Ruoli e accessi avanzati</li>
                <li>Integrazioni personalizzate</li>
              </ul>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                target="_blank"
                rel="noreferrer"
                style={{ ...fullButtonStyle, background: "#111827" }}
              >
                Parla con noi
              </a>
            </div>
          </div>
        </section>

        <section style={ctaStyle}>
          <div>
            <h2 style={{ margin: 0, color: "white", fontSize: 34, letterSpacing: "-0.04em" }}>
              Vuoi provarlo nel tuo ristorante?
            </h2>
            <p style={{ color: "rgba(255,255,255,0.86)", lineHeight: 1.65, marginBottom: 0 }}>
              Accedi, configura menu e tavoli, poi attiva il piano quando sei pronto.
            </p>
          </div>
          <Link to="/login" style={heroPrimaryStyle}>Inizia ora</Link>
        </section>
      </main>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eef6ff 0%, #f8fbff 100%)",
  color: "#123b6b",
};

const headerStyle = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid #dce8f6",
  padding: "12px 22px",
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "center",
  flexWrap: "wrap",
};

const brandStyle = { display: "flex", alignItems: "center", gap: 12, textDecoration: "none" };
const logoWrapStyle = { width: 46, height: 46, borderRadius: 14, background: "white", padding: 7, boxShadow: "0 8px 18px rgba(18,59,107,0.10)" };
const navStyle = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const navLinkStyle = { color: "#42658f", textDecoration: "none", fontWeight: 850, padding: "9px 10px" };
const outlineButtonStyle = { ...navLinkStyle, border: "1px solid #cfe0f4", borderRadius: 12, background: "white" };
const primarySmallStyle = { ...outlineButtonStyle, background: "#2563eb", color: "white", borderColor: "#2563eb" };

const mainStyle = { maxWidth: 1180, margin: "0 auto", padding: "28px 18px 70px" };
const heroStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 24,
  alignItems: "center",
  borderRadius: 30,
  padding: "36px 28px",
  background: "linear-gradient(135deg, #123b6b 0%, #2563eb 58%, #0891b2 100%)",
  boxShadow: "0 24px 50px rgba(18,59,107,0.18)",
};
const pillStyle = { display: "inline-flex", padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.14)", color: "white", fontWeight: 900, fontSize: 13 };
const pillLightStyle = { display: "inline-flex", padding: "8px 12px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontWeight: 900, fontSize: 13 };
const heroTitleStyle = { color: "white", fontSize: "clamp(38px, 5vw, 62px)", lineHeight: 1.02, letterSpacing: "-0.06em", margin: "18px 0 0", maxWidth: 780 };
const heroTextStyle = { color: "rgba(255,255,255,0.88)", fontSize: 18, lineHeight: 1.65, maxWidth: 700 };
const buttonRowStyle = { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 };
const heroPrimaryStyle = { textDecoration: "none", borderRadius: 16, padding: "14px 18px", background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)", color: "white", fontWeight: 950, boxShadow: "0 16px 24px rgba(16,185,129,0.20)" };
const heroSecondaryStyle = { textDecoration: "none", borderRadius: 16, padding: "14px 18px", background: "rgba(255,255,255,0.12)", color: "white", fontWeight: 950, border: "1px solid rgba(255,255,255,0.20)" };

const panelStyle = { background: "rgba(255,255,255,0.96)", borderRadius: 24, padding: 22, boxShadow: "0 18px 34px rgba(18,59,107,0.16)" };
const mutedLabelStyle = { color: "#6480a6", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" };
const statusStyle = { background: "#dcfce7", color: "#166534", borderRadius: 999, padding: "7px 11px", fontWeight: 900, fontSize: 12 };
const orderRowStyle = { display: "flex", justifyContent: "space-between", gap: 12, border: "1px solid #dce8f6", background: "#f8fbff", borderRadius: 14, padding: "13px 14px", color: "#0b2e59" };

const compactGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 18 };
const cardStyle = { background: "white", border: "1px solid #dce8f6", borderRadius: 22, padding: 22, boxShadow: "0 12px 26px rgba(18,59,107,0.06)" };
const iconStyle = { width: 48, height: 48, borderRadius: 16, background: "#eff6ff", display: "grid", placeItems: "center", fontSize: 24 };
const cardTitle = { margin: "14px 0 0", fontSize: 20, color: "#0b2e59" };
const cardText = { color: "#5a7497", lineHeight: 1.6 };

const sectionStyle = { marginTop: 22, background: "rgba(255,255,255,0.92)", border: "1px solid #dce8f6", borderRadius: 26, padding: "28px 24px", boxShadow: "0 14px 30px rgba(18,59,107,0.06)" };
const sectionTitleStyle = { margin: "10px 0 0", color: "#0b2e59", fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.08, letterSpacing: "-0.04em" };
const sectionTextStyle = { color: "#5a7497", fontSize: 17, lineHeight: 1.65 };
const stepsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 18 };
const stepStyle = { display: "flex", gap: 14, alignItems: "flex-start", background: "#f8fbff", border: "1px solid #dce8f6", borderRadius: 18, padding: 16 };
const stepNumber = { width: 36, height: 36, borderRadius: "50%", background: "#2563eb", color: "white", display: "grid", placeItems: "center", flex: "0 0 auto" };

const pricingGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 };
const priceCardStyle = { position: "relative", background: "white", border: "1px solid #dce8f6", borderRadius: 26, padding: 26, boxShadow: "0 16px 34px rgba(18,59,107,0.08)" };
const recommendedStyle = { position: "absolute", top: 16, right: 16, background: "#22c55e", color: "white", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 950 };
const priceTitleStyle = { margin: 0, color: "#0b2e59", fontSize: 25 };
const priceStyle = { marginTop: 14, color: "#0b2e59", fontSize: 44, fontWeight: 950, letterSpacing: "-0.05em" };
const perStyle = { fontSize: 16, color: "#6480a6", marginLeft: 6, letterSpacing: 0 };
const featureListStyle = { color: "#42658f", lineHeight: 1.9, paddingLeft: 20, fontWeight: 750 };
const fullButtonStyle = { display: "block", textAlign: "center", marginTop: 18, textDecoration: "none", borderRadius: 16, padding: "14px 16px", background: "#2563eb", color: "white", fontWeight: 950 };

const ctaStyle = { marginTop: 22, borderRadius: 26, padding: "28px 24px", background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)", display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "center" };

export default Landing;
