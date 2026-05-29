import { Link } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";

const WHATSAPP_NUMBER = "3240467723";
const WHATSAPP_MESSAGE = "Ciao, vorrei informazioni su EasyMenu per il mio ristorante.";

const checkoutPath = (plan) => `/register?next=/billing&plan=${plan}`;

function FlowStep({ number, title, text, tone = "blue" }) {
  const colors = {
    blue: ["#2563eb", "#eff6ff"],
    green: ["#16a34a", "#ecfdf5"],
    amber: ["#d97706", "#fffbeb"],
    cyan: ["#0891b2", "#ecfeff"],
  }[tone];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "34px 1fr",
        gap: 12,
        alignItems: "start",
        padding: "13px 14px",
        borderRadius: 18,
        background: colors[1],
        border: "1px solid rgba(148,163,184,0.20)",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          background: colors[0],
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 950,
          fontSize: 14,
        }}
      >
        {number}
      </div>
      <div>
        <div style={{ fontWeight: 950, color: "#0b2e59", fontSize: 15 }}>{title}</div>
        <div style={{ color: "#526f95", fontSize: 13, lineHeight: 1.45, marginTop: 3 }}>{text}</div>
      </div>
    </div>
  );
}

function WorkloadLane({ label, status, items, color }) {
  return (
    <div
      style={{
        background: "#f8fbff",
        border: "1px solid #dce8f6",
        borderRadius: 18,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 950, color: "#0b2e59" }}>{label}</div>
        <div
          style={{
            background: color,
            color: "white",
            borderRadius: 999,
            padding: "5px 9px",
            fontSize: 11,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          {status}
        </div>
      </div>
      <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
        {items.map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              color: "#42658f",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <span>{item}</span>
            <span>✓</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.92)",
        border: "1px solid #dce8f6",
        borderRadius: 24,
        padding: 22,
        boxShadow: "0 18px 34px rgba(18,59,107,0.06)",
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 23,
          color: "white",
          marginBottom: 14,
        }}
      >
        {icon}
      </div>
      <h3 style={{ margin: 0, fontSize: 21, fontWeight: 950, color: "#0b2e59", letterSpacing: "-0.03em" }}>
        {title}
      </h3>
      <p style={{ margin: "10px 0 0", color: "#5a7497", lineHeight: 1.62, fontSize: 15 }}>{text}</p>
    </div>
  );
}

function PricingCard({ title, price, subtitle, features, highlighted, cta, to }) {
  return (
    <div
      style={{
        background: highlighted
          ? "linear-gradient(135deg, rgba(18,59,107,0.98) 0%, rgba(37,99,235,0.94) 100%)"
          : "rgba(255,255,255,0.96)",
        color: highlighted ? "white" : "#123b6b",
        borderRadius: 28,
        padding: 28,
        border: highlighted ? "1px solid rgba(255,255,255,0.16)" : "1px solid #dce8f6",
        boxShadow: highlighted ? "0 24px 46px rgba(18,59,107,0.18)" : "0 18px 34px rgba(18,59,107,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {highlighted && (
        <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "#22c55e",
            color: "white",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 950,
          }}
        >
          Per ristoranti
        </div>
      )}
      <h3 style={{ margin: 0, fontSize: 25, fontWeight: 950, letterSpacing: "-0.03em" }}>{title}</h3>
      <div style={{ marginTop: 16, display: "flex", alignItems: "end", gap: 8 }}>
        <div style={{ fontSize: price === "Su misura" ? 42 : 48, fontWeight: 950, letterSpacing: "-0.05em", lineHeight: 1 }}>
          {price}
        </div>
        {price !== "Su misura" && (
          <div style={{ marginBottom: 6, opacity: highlighted ? 0.86 : 0.68, fontWeight: 900 }}>/ mese</div>
        )}
      </div>
      <p style={{ marginTop: 14, color: highlighted ? "rgba(255,255,255,0.84)" : "#5a7497", lineHeight: 1.65 }}>
        {subtitle}
      </p>
      <div style={{ display: "grid", gap: 11, marginTop: 20 }}>
        {features.map((feature) => (
          <div
            key={feature}
            style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 850, color: highlighted ? "rgba(255,255,255,0.92)" : "#42658f" }}
          >
            <span style={{ color: highlighted ? "#86efac" : "#16a34a" }}>✓</span>
            <span>{feature}</span>
          </div>
        ))}
      </div>
      {to ? (
        <Link to={to} style={{ ...pricingButtonStyle, background: highlighted ? "#22c55e" : "#123b6b" }}>
          {cta}
        </Link>
      ) : (
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
          target="_blank"
          rel="noreferrer"
          style={{ ...pricingButtonStyle, background: highlighted ? "#22c55e" : "#123b6b" }}
        >
          {cta}
        </a>
      )}
    </div>
  );
}

function Landing() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at 0% 0%, rgba(37,99,235,0.14), transparent 26%),
          radial-gradient(circle at 100% 0%, rgba(14,165,233,0.12), transparent 24%),
          linear-gradient(180deg, #eef6ff 0%, #e3efff 42%, #f8fbff 100%)
        `,
        color: "#123b6b",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(14px)",
          background: "rgba(255,255,255,0.74)",
          borderBottom: "1px solid rgba(148,163,184,0.14)",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: "14px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 15,
                background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: 7,
              }}
            >
              <img src={logoEasyMenu} alt="EasyMenu" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 950, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#0b2e59" }}>
                EasyMenu
              </div>
              <div style={{ fontSize: 13, color: "#6480a6", marginTop: 4 }}>Ordini al tavolo, senza confusione</div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a href="#funzioni" style={navLinkStyle}>Funzioni</a>
            <a href="#flusso" style={navLinkStyle}>Flusso</a>
            <a href="#prezzi" style={navLinkStyle}>Prezzi</a>
            <Link to="/login" style={navButtonSecondary}>Login</Link>
            <Link to="/login" style={navButtonPrimary}>Inizia ora</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 22px 82px" }}>
        <section style={heroSectionStyle}>
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "minmax(320px, 1.02fr) minmax(360px, 0.98fr)",
              gap: 32,
              alignItems: "center",
            }}
          >
            <div>
              <div style={heroBadgeStyle}>Software semplice per ordinare dal tavolo</div>
              <h1 style={heroTitleStyle}>Il cliente scansiona il QR, ordina e lo staff lavora meglio.</h1>
              <p style={heroTextStyle}>
                EasyMenu unisce menu digitale, ordini dal tavolo, cucina, bar, cassa e gestione tavoli.
                Meno attese, meno errori, più velocità operativa.
              </p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
                <Link to="/login" style={heroPrimaryButton}>Attiva ora</Link>
                <a href="#prezzi" style={heroSecondaryButton}>Vedi prezzi</a>
              </div>
            </div>

            <div style={flowPanelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={panelLabelStyle}>Prova concreta del flusso</div>
                  <div style={{ fontSize: 28, color: "#0b2e59", fontWeight: 950, marginTop: 4, letterSpacing: "-0.04em" }}>Tavolo 12</div>
                </div>
                <span style={livePillStyle}>Live</span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <FlowStep number="1" title="QR sul tavolo" text="Il cliente apre il menu già collegato al tavolo 12." tone="blue" />
                <FlowStep number="2" title="Ordine dal telefono" text="2 Carbonare, 1 acqua, nota: senza pepe." tone="cyan" />
                <FlowStep number="3" title="Smistamento automatico" text="Cucina vede i piatti, bar vede le bevande." tone="amber" />
                <FlowStep number="4" title="Cassa pronta" text="Totale tavolo aggiornato: €28,00, pronto per pagamento." tone="green" />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <WorkloadLane label="Cucina" status="2 piatti" color="#d97706" items={["Carbonara x2", "Nota visibile"]} />
                <WorkloadLane label="Bar" status="1 bevanda" color="#0891b2" items={["Acqua x1", "Pronta"]} />
                <WorkloadLane label="Cassa" status="€28,00" color="#16a34a" items={["Tavolo 12", "Conto aggiornato"]} />
              </div>
            </div>
          </div>
        </section>

        <section id="funzioni" style={compactSectionStyle}>
          <FeatureCard icon="📱" title="Menu e ordine dal QR" text="Il cliente vede il menu responsive, sceglie prodotti e invia l’ordine dal tavolo corretto." />
          <FeatureCard icon="👨‍🍳" title="Cucina e bar separati" text="Ogni reparto riceve solo ciò che deve preparare, con stati chiari e aggiornamenti live." />
          <FeatureCard icon="💳" title="Cassa e tavoli più veloci" text="Il conto è già ordinato per tavolo. Meno passaggi manuali e meno errori di comunicazione." />
        </section>

        <section id="flusso" style={explainSectionStyle}>
          <div>
            <div style={smallPillStyle}>Perché serve davvero</div>
            <h2 style={sectionTitleStyle}>Un solo flusso operativo: tavolo, ordine, reparto, cassa.</h2>
            <p style={sectionTextStyle}>
              Non è una demo estetica: è il percorso reale che riduce lavoro ripetitivo in sala e rende ogni ordine tracciabile.
            </p>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <FlowStep number="1" title="Crei i tavoli" text="Solo numero tavolo e QR: niente campi inutili come posti o zone obbligatorie." tone="blue" />
            <FlowStep number="2" title="Carichi il menu" text="Nome, prezzo, descrizione, ingredienti e area preparazione: cucina o bar." tone="cyan" />
            <FlowStep number="3" title="Lo staff lavora dalle pagine operative" text="Cucina, bar e cassa hanno schermate separate, semplici e veloci." tone="green" />
          </div>
        </section>

        <section id="prezzi" style={{ marginBottom: 28 }}>
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 22px" }}>
            <div style={{ ...smallPillStyle, background: "#fff7ed", color: "#c2410c" }}>Prezzi semplici</div>
            <h2 style={sectionTitleStyle}>Due opzioni, senza confusione.</h2>
            <p style={sectionTextStyle}>
              Un piano chiaro per il singolo ristorante e una soluzione su misura per catene o gruppi multi-sede.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            <PricingCard
              highlighted
              title="Ristorante"
              price="€49,99"
              subtitle="Per ristoranti, bar, pizzerie e locali che vogliono gestire menu, QR e ordini in un unico flusso."
              features={["Menu digitale responsive", "QR per tavolo", "Cucina, bar e cassa", "Dashboard e statistiche essenziali", "Supporto onboarding"]}
              cta="Vai al pagamento"
              to={checkoutPath("restaurant")}
            />
            <PricingCard
              title="Catene e gruppi"
              price="Su misura"
              subtitle="Per più locali, gestione multi-ristorante, permessi avanzati, setup guidato e condizioni dedicate."
              features={["Multi sede", "Ruoli e accessi avanzati", "Setup personalizzato", "Supporto prioritario", "Roadmap dedicata"]}
              cta="Parla con noi"
            />
          </div>
        </section>

        <section style={finalCtaStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 36, lineHeight: 1.08, letterSpacing: "-0.04em" }}>
              Pronto per semplificare il lavoro del tuo ristorante?
            </h2>
            <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.88)", lineHeight: 1.65, fontSize: 17 }}>
              Accedi, configura tavoli e menu, genera i QR e prova il flusso operativo reale.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link to="/login" style={heroPrimaryButton}>Accedi</Link>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`} target="_blank" rel="noreferrer" style={heroSecondaryButton}>
              WhatsApp
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

const navLinkStyle = {
  textDecoration: "none",
  color: "#42658f",
  fontWeight: 850,
  padding: "10px 12px",
  borderRadius: 12,
};

const navButtonPrimary = {
  textDecoration: "none",
  borderRadius: 14,
  padding: "12px 16px",
  background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
  color: "white",
  fontWeight: 950,
};

const navButtonSecondary = {
  textDecoration: "none",
  borderRadius: 14,
  padding: "12px 16px",
  background: "rgba(255,255,255,0.88)",
  color: "#123b6b",
  fontWeight: 950,
  border: "1px solid #dce8f6",
};

const heroSectionStyle = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 34,
  padding: "46px 34px",
  background: "linear-gradient(135deg, rgba(18,59,107,0.97) 0%, rgba(29,78,216,0.92) 52%, rgba(8,145,178,0.84) 100%)",
  boxShadow: "0 30px 64px rgba(18,59,107,0.18)",
  marginBottom: 24,
  border: "1px solid rgba(255,255,255,0.10)",
};

const heroBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 14,
  marginBottom: 18,
};

const heroTitleStyle = {
  margin: 0,
  color: "white",
  fontSize: "clamp(42px, 5vw, 76px)",
  lineHeight: 1.03,
  letterSpacing: "-0.06em",
  fontWeight: 950,
  maxWidth: 740,
};

const heroTextStyle = {
  marginTop: 18,
  marginBottom: 0,
  color: "rgba(255,255,255,0.90)",
  fontSize: 20,
  lineHeight: 1.55,
  maxWidth: 720,
};

const heroPrimaryButton = {
  textDecoration: "none",
  borderRadius: 18,
  padding: "16px 21px",
  background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
  color: "white",
  fontWeight: 950,
  fontSize: 16,
  boxShadow: "0 16px 26px rgba(16,185,129,0.20)",
};

const heroSecondaryButton = {
  textDecoration: "none",
  borderRadius: 18,
  padding: "16px 21px",
  background: "rgba(255,255,255,0.13)",
  color: "white",
  fontWeight: 950,
  fontSize: 16,
  border: "1px solid rgba(255,255,255,0.20)",
};

const flowPanelStyle = {
  background: "rgba(255,255,255,0.96)",
  borderRadius: 30,
  padding: 24,
  boxShadow: "0 24px 44px rgba(18,59,107,0.16)",
  border: "1px solid rgba(255,255,255,0.82)",
};

const panelLabelStyle = {
  fontSize: 13,
  color: "#6480a6",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const livePillStyle = {
  background: "#dcfce7",
  color: "#166534",
  borderRadius: 999,
  padding: "9px 13px",
  fontSize: 12,
  fontWeight: 950,
};

const compactSectionStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 18,
  marginBottom: 24,
};

const explainSectionStyle = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: 30,
  padding: "30px 28px",
  border: "1px solid #dce8f6",
  boxShadow: "0 18px 34px rgba(18,59,107,0.06)",
  marginBottom: 24,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 24,
  alignItems: "start",
};

const smallPillStyle = {
  display: "inline-flex",
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 950,
  marginBottom: 13,
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: "clamp(30px, 3vw, 42px)",
  lineHeight: 1.08,
  letterSpacing: "-0.04em",
  color: "#0b2e59",
};

const sectionTextStyle = {
  marginTop: 14,
  color: "#5a7497",
  fontSize: 17,
  lineHeight: 1.7,
};

const pricingButtonStyle = {
  display: "block",
  textAlign: "center",
  marginTop: 24,
  textDecoration: "none",
  borderRadius: 18,
  padding: "15px 18px",
  color: "white",
  fontWeight: 950,
};

const finalCtaStyle = {
  background: "linear-gradient(135deg, rgba(18,59,107,0.98) 0%, rgba(29,78,216,0.92) 100%)",
  borderRadius: 30,
  padding: "32px 30px",
  color: "white",
  boxShadow: "0 24px 46px rgba(18,59,107,0.16)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 22,
  alignItems: "center",
};

export default Landing;
