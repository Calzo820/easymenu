import { Link } from "react-router-dom";
import logoEasyMenu from "../assets/logo-easymenu.png";

const WHATSAPP_NUMBER = "3240467723";
const WHATSAPP_MESSAGE =
  "Ciao, vorrei provare EasyMenu per il mio ristorante.";

function FeatureCard({ icon, title, text }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.90)",
        border: "1px solid rgba(255,255,255,0.72)",
        borderRadius: 24,
        padding: 24,
        boxShadow: "0 18px 34px rgba(18,59,107,0.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 18,
          background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          color: "white",
          boxShadow: "0 14px 24px rgba(37,99,235,0.18)",
          marginBottom: 16,
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 900,
          color: "#0b2e59",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          marginTop: 12,
          marginBottom: 0,
          color: "#5a7497",
          lineHeight: 1.68,
          fontSize: 15,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function StepCard({ number, title, text }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.94)",
        borderRadius: 22,
        padding: 22,
        border: "1px solid #dce8f6",
        boxShadow: "0 18px 34px rgba(18,59,107,0.09)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 16,
          marginBottom: 16,
          boxShadow: "0 10px 18px rgba(37,99,235,0.18)",
        }}
      >
        {number}
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 900,
          color: "#123b6b",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          marginTop: 10,
          marginBottom: 0,
          color: "#5a7497",
          lineHeight: 1.68,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function BenefitRow({ title, text }) {
  return (
    <div
      style={{
        padding: "16px 0",
        borderBottom: "1px solid rgba(100,128,166,0.16)",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          color: "#0b2e59",
          fontSize: 18,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: "#5a7497",
          lineHeight: 1.68,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function StatPill({ value, label }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.16)",
        color: "white",
        borderRadius: 18,
        padding: "16px 18px",
        minWidth: 150,
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          opacity: 0.92,
          lineHeight: 1.35,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function PricingCard({
  title,
  price,
  subtitle,
  features,
  highlighted,
  ctaLabel = "Contattaci",
  ctaTo,
  contactMode = false,
}) {
  const buttonStyle = {
    display: "block",
    textAlign: "center",
    marginTop: 24,
    textDecoration: "none",
    borderRadius: 18,
    padding: "15px 18px",
    background: highlighted
      ? "linear-gradient(135deg, #22c55e 0%, #10b981 100%)"
      : "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
    color: "white",
    fontWeight: 950,
    boxShadow: highlighted
      ? "0 16px 26px rgba(16,185,129,0.22)"
      : "0 12px 20px rgba(37,99,235,0.14)",
    transition: "transform 160ms ease, box-shadow 160ms ease",
  };

  return (
    <div
      style={{
        background: highlighted
          ? "linear-gradient(135deg, rgba(18,59,107,0.98) 0%, rgba(37,99,235,0.94) 100%)"
          : "rgba(255,255,255,0.94)",
        color: highlighted ? "white" : "#123b6b",
        borderRadius: 28,
        padding: 26,
        border: highlighted ? "1px solid rgba(255,255,255,0.16)" : "1px solid #dce8f6",
        boxShadow: highlighted
          ? "0 24px 46px rgba(18,59,107,0.18)"
          : "0 18px 34px rgba(18,59,107,0.06)",
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
            fontWeight: 900,
          }}
        >
          14 giorni gratis
        </div>
      )}

      <h3 style={{ margin: 0, fontSize: 24, fontWeight: 950, letterSpacing: "-0.03em" }}>
        {title}
      </h3>

      <div style={{ marginTop: 16, display: "flex", alignItems: "end", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 46, fontWeight: 950, letterSpacing: "-0.05em", lineHeight: 1 }}>
          {price}
        </div>
        {highlighted && (
          <div style={{ marginBottom: 6, opacity: 0.86, fontWeight: 800 }}>/ mese</div>
        )}
      </div>

      <p
        style={{
          marginTop: 14,
          color: highlighted ? "rgba(255,255,255,0.84)" : "#5a7497",
          lineHeight: 1.65,
        }}
      >
        {subtitle}
      </p>

      <div style={{ display: "grid", gap: 11, marginTop: 20 }}>
        {features.map((feature) => (
          <div
            key={feature}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontWeight: 800,
              color: highlighted ? "rgba(255,255,255,0.92)" : "#42658f",
            }}
          >
            <span style={{ color: highlighted ? "#86efac" : "#16a34a" }}>✓</span>
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {ctaTo ? (
        <Link to={ctaTo} className="em-lift" style={buttonStyle}>
          {ctaLabel}
        </Link>
      ) : (
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
          target="_blank"
          rel="noreferrer"
          className="em-lift"
          style={buttonStyle}
        >
          {ctaLabel}
        </a>
      )}

      {contactMode && (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 8,
            color: "#42658f",
            fontWeight: 850,
            fontSize: 14,
          }}
        >
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`} target="_blank" rel="noreferrer" className="em-lift" style={contactLinkStyle}>WhatsApp: +39 {WHATSAPP_NUMBER}</a>
          <a href="mailto:info@easymenu.it" className="em-lift" style={contactLinkStyle}>Email: info@easymenu.it</a>
          <a href={`tel:+39${WHATSAPP_NUMBER}`} className="em-lift" style={contactLinkStyle}>Chiamata: +39 {WHATSAPP_NUMBER}</a>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ children, tone = "blue" }) {
  const tones = {
    blue: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    amber: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
    green: { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
    slate: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  };
  const current = tones[tone] || tones.blue;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        padding: "7px 10px",
        background: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        fontSize: 12,
        fontWeight: 950,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function WorkstationCard({ icon, title, status, tone, lines }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #dce8f6",
        borderRadius: 20,
        padding: 16,
        boxShadow: "0 18px 34px rgba(18,59,107,0.11)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: "#f4f9ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 21,
            }}
          >
            {icon}
          </div>
          <div
            style={{
              fontWeight: 950,
              color: "#0b2e59",
              fontSize: 17,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
        </div>
        <StatusBadge tone={tone}>{status}</StatusBadge>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {lines.map((line) => (
          <div
            key={line}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#42658f",
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#22c55e",
                flex: "0 0 auto",
              }}
            />
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function OperationalFlowDemo() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        borderRadius: 30,
        padding: 24,
        boxShadow: "0 24px 44px rgba(18,59,107,0.16)",
        border: "1px solid rgba(255,255,255,0.8)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#2563eb",
              fontWeight: 950,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Prova operativa reale
          </div>
          <div
            style={{
              fontSize: 27,
              color: "#0b2e59",
              fontWeight: 950,
              marginTop: 7,
              letterSpacing: "-0.04em",
            }}
          >
            Tavolo 12 · Ordine #184
          </div>
        </div>
        <StatusBadge tone="green">Live</StatusBadge>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          marginBottom: 18,
        }}
      >
        {["QR", "Ordine", "Cucina", "Cassa"].map((step, index) => (
          <div
            key={step}
            style={{
              background: index === 0 ? "#ecfdf5" : index === 1 ? "#eff6ff" : index === 2 ? "#fffbeb" : "#f8fafc",
              border: "1px solid #dce8f6",
              borderRadius: 16,
              padding: "11px 8px",
              textAlign: "center",
              color: "#123b6b",
              fontWeight: 950,
              fontSize: 12,
            }}
          >
            {index + 1}. {step}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={demoRowStyle}>
          <div>
            <div style={demoTitleStyle}>🍝 Carbonara</div>
            <div style={demoSubStyle}>x2 · senza pepe su una porzione</div>
          </div>
          <StatusBadge tone="amber">Cucina</StatusBadge>
        </div>

        <div style={demoRowStyle}>
          <div>
            <div style={demoTitleStyle}>🍷 Calice rosso</div>
            <div style={demoSubStyle}>x2 · reparto bar</div>
          </div>
          <StatusBadge tone="blue">Bar</StatusBadge>
        </div>

        <div style={demoRowStyle}>
          <div>
            <div style={demoTitleStyle}>🍰 Tiramisù</div>
            <div style={demoSubStyle}>servire dopo i primi</div>
          </div>
          <StatusBadge tone="slate">In coda</StatusBadge>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        <WorkstationCard
          icon="👨‍🍳"
          title="Cucina"
          status="Prepara"
          tone="amber"
          lines={["ordine grande e leggibile", "stato aggiornato in tempo reale"]}
        />
        <WorkstationCard
          icon="💶"
          title="Cassa"
          status="Totale €46,50"
          tone="green"
          lines={["conto già pronto", "storico tavolo salvato"]}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          borderRadius: 18,
          padding: "14px 16px",
          background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
          color: "white",
          fontWeight: 950,
          boxShadow: "0 18px 28px rgba(37,99,235,0.18)",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span>Ordine ricevuto da tutti i reparti</span>
        <span style={{ opacity: 0.86, fontSize: 13 }}>0 passaggi manuali</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        <Link to="/billing" className="em-lift" style={demoPrimaryButton}>
          Prova 14 giorni
        </Link>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
          target="_blank"
          rel="noreferrer"
          className="em-lift"
          style={demoSecondaryButton}
        >
          Parla con noi
        </a>
      </div>
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
          radial-gradient(circle at 50% 100%, rgba(16,185,129,0.08), transparent 28%),
          linear-gradient(180deg, #eef6ff 0%, #e3efff 34%, #eef6ff 70%, #f8fbff 100%)
        `,
        color: "#123b6b",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(14px)",
          background: "rgba(255,255,255,0.72)",
          borderBottom: "1px solid rgba(148,163,184,0.14)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "16px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 14px 24px rgba(37,99,235,0.18)",
                overflow: "hidden",
                padding: 7,
              }}
            >
              <img
                src={logoEasyMenu}
                alt="EasyMenu"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  color: "#0b2e59",
                }}
              >
                EasyMenu
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6480a6",
                  marginTop: 4,
                }}
              >
                Ordini al tavolo, senza attese
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Link to="/dashboard" className="em-lift" style={navLinkStyle}>
              Dashboard
            </Link>
            <Link to="/admin" className="em-lift" style={navLinkStyle}>
              Area Admin
            </Link>
            <a href="#prezzi" className="em-lift" style={navLinkStyle}>
              Prezzi
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noreferrer"
              className="em-lift"
              style={navLinkStyle}
            >
              WhatsApp
            </a>
            <Link to="/menu/demo/demo-table-1?tavolo=1&demo=1" className="em-lift" style={navButtonSecondary}>
              Demo menu
            </Link>
            <Link to="/admin" className="em-lift" style={navButtonPrimary}>
              Inizia ora
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "34px 22px 90px" }}>
        <section
          id="flusso-operativo"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 34,
            padding: "42px 34px",
            background:
              "linear-gradient(135deg, rgba(18,59,107,0.97) 0%, rgba(29,78,216,0.92) 52%, rgba(8,145,178,0.84) 100%)",
            boxShadow: "0 30px 64px rgba(18,59,107,0.18)",
            marginBottom: 26,
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -120,
              top: -120,
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              filter: "blur(10px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -90,
              bottom: -90,
              width: 260,
              height: 260,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              filter: "blur(8px)",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: 28,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  color: "white",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 13,
                  marginBottom: 18,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#22c55e",
                  }}
                />
                SaaS per ristoranti pronto da usare
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    padding: 10,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <img
                    src={logoEasyMenu}
                    alt="EasyMenu"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                <div
                  style={{
                    color: "white",
                    fontSize: 28,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                  }}
                >
                  EasyMenu
                </div>
              </div>

              <h1
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: 58,
                  lineHeight: 1.03,
                  letterSpacing: "-0.05em",
                  fontWeight: 950,
                  maxWidth: 760,
                }}
              >
                Il menu digitale che fa ordinare il cliente direttamente dal tavolo.
              </h1>

              <p
                style={{
                  marginTop: 20,
                  marginBottom: 0,
                  color: "rgba(255,255,255,0.88)",
                  fontSize: 19,
                  lineHeight: 1.7,
                  maxWidth: 720,
                }}
              >
                EasyMenu riduce attese, alleggerisce il lavoro della sala e invia gli ordini
                in tempo reale a cucina, bar e cassa. Più ordine, meno errori, più velocità.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  marginTop: 26,
                }}
              >
                <Link to="/admin" className="em-lift" style={heroPrimaryButton}>
                  Attiva il tuo ristorante
                </Link>
                <a href="#flusso-operativo" className="em-lift" style={heroSecondaryButton}>
                  Vedi il flusso completo
                </a>

              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 28,
                }}
              >
                <StatPill value="QR" label="Ogni tavolo apre il menu corretto" />
                <StatPill value="Live" label="Ordini aggiornati in tempo reale" />
                <StatPill value="Sala" label="Meno passaggi inutili per i camerieri" />
              </div>
            </div>

            <OperationalFlowDemo />
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 18,
            marginBottom: 26,
          }}
        >
          <FeatureCard
            icon="📱"
            title="Ordini dal tavolo"
            text="Il cliente inquadra il QR, apre il menu e ordina senza aspettare il cameriere. Più rapidità e meno attrito."
          />
          <FeatureCard
            icon="👨‍🍳"
            title="Cucina e bar sincronizzati"
            text="Gli ordini arrivano subito ai reparti giusti con stato aggiornato in tempo reale. Più controllo e meno confusione."
          />
          <FeatureCard
            icon="💳"
            title="Cassa più semplice"
            text="Il tavolo arriva in cassa già ordinato, con totale, extra, coperti e storico. Meno errori e più velocità in chiusura."
          />
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.92)",
            borderRadius: 30,
            padding: "30px 28px",
            border: "1px solid #dce8f6",
            boxShadow: "0 18px 34px rgba(18,59,107,0.06)",
            marginBottom: 26,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.95fr 1.05fr",
              gap: 26,
              alignItems: "start",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 900,
                  marginBottom: 14,
                }}
              >
                Perché vende meglio
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: 40,
                  lineHeight: 1.08,
                  letterSpacing: "-0.04em",
                  color: "#0b2e59",
                }}
              >
                Non è solo un menu digitale. È un flusso operativo più efficiente.
              </h2>

              <p
                style={{
                  marginTop: 16,
                  color: "#5a7497",
                  fontSize: 17,
                  lineHeight: 1.72,
                  maxWidth: 620,
                }}
              >
                Un ristoratore non compra “una pagina web”. Compra velocità, ordine, meno
                errori, più tavoli gestiti e una migliore esperienza cliente.
              </p>
            </div>

            <div>
              <BenefitRow
                title="Meno attese al tavolo"
                text="Il cliente non deve aspettare per chiedere il menu o ordinare. Questo migliora subito la percezione del servizio."
              />
              <BenefitRow
                title="Meno carico sulla sala"
                text="I camerieri non perdono tempo su passaggi ripetitivi e possono concentrarsi su servizio, upsell e gestione della sala."
              />
              <BenefitRow
                title="Ordini più ordinati"
                text="Cucina, bar e cassa vedono lo stesso flusso operativo. Ogni reparto sa cosa fare e in che stato si trova il tavolo."
              />
              <BenefitRow
                title="Più controllo per il titolare"
                text="Storico, statistiche e incassi rendono il prodotto più percepito come gestionale operativo, non solo come menu QR."
              />
            </div>
          </div>
        </section>

        <section
          style={{
            marginBottom: 26,
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "inline-flex",
                background: "#ecfdf5",
                color: "#047857",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 900,
                marginBottom: 14,
              }}
            >
              Come funziona
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 38,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                color: "#0b2e59",
              }}
            >
              Un flusso semplice per il cliente. Un grande alleggerimento per il ristorante.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 18,
            }}
          >
            <StepCard
              number="1"
              title="Il cliente scansiona il QR"
              text="Ogni tavolo apre direttamente il menu corretto, senza errori e senza passaggi manuali."
            />
            <StepCard
              number="2"
              title="Ordina dal telefono"
              text="Piatti, bevande, note e tempi di servizio vengono inviati in modo chiaro e immediato."
            />
            <StepCard
              number="3"
              title="Cucina e bar ricevono tutto"
              text="Ogni reparto vede solo ciò che gli serve, con priorità e stato aggiornato in tempo reale."
            />
            <StepCard
              number="4"
              title="La cassa chiude più velocemente"
              text="Il conto è già organizzato e lo storico resta disponibile per analisi e controllo."
            />
          </div>
        </section>

        <section
          id="prezzi"
          style={{
            marginBottom: 26,
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: 760,
              margin: "0 auto 22px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                background: "#fff7ed",
                color: "#c2410c",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 900,
                marginBottom: 14,
              }}
            >
              Prezzi semplici
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 40,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                color: "#0b2e59",
              }}
            >
              Due opzioni chiare: un ristorante o più sedi.
            </h2>

            <p
              style={{
                marginTop: 14,
                color: "#5a7497",
                fontSize: 17,
                lineHeight: 1.7,
              }}
            >
              Il piano mensile porta direttamente al pagamento. Per catene e gruppi trovi un contatto diretto per configurare tutto su misura.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 18,
              maxWidth: 980,
              margin: "0 auto",
            }}
          >
            <PricingCard
              highlighted
              title="Mensile"
              price="€49,99"
              subtitle="Per il singolo ristorante: 2 settimane di prova, poi abbonamento mensile. Attivi menu, QR, cucina, sala e cassa."
              features={[
                "2 settimane di prova incluse",
                "QR tavoli e menu digitale",
                "Ordini live verso cucina, bar e cassa",
                "Dashboard, storico e supporto avvio",
              ]}
              ctaLabel="Vai al pagamento"
              ctaTo="/billing"
            />
            <PricingCard
              title="Catene"
              price="Su misura"
              subtitle="Per gruppi con più locali, esigenze operative diverse, supporto dedicato e configurazione personalizzata."
              features={[
                "Multi-ristorante e sedi multiple",
                "Onboarding personalizzato",
                "Flussi cucina/cassa su misura",
                "Contatto diretto WhatsApp, email o chiamata",
              ]}
              ctaLabel="Contattaci"
              contactMode
            />
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.92)",
            borderRadius: 30,
            padding: "30px 28px",
            border: "1px solid #dce8f6",
            boxShadow: "0 18px 34px rgba(18,59,107,0.06)",
            marginBottom: 26,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.95fr 1.05fr",
              gap: 26,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 900,
                  marginBottom: 14,
                }}
              >
                Onboarding semplice
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: 38,
                  lineHeight: 1.08,
                  letterSpacing: "-0.04em",
                  color: "#0b2e59",
                }}
              >
                Dal menu ai QR: il ristorante può essere operativo in poco tempo.
              </h2>

              <p
                style={{
                  marginTop: 16,
                  color: "#5a7497",
                  fontSize: 17,
                  lineHeight: 1.72,
                }}
              >
                Inserisci categorie e prodotti, genera i QR dei tavoli, collega cucina,
                bar e cassa. Il cliente prova la demo, poi passa all’attivazione reale.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 22,
                }}
              >
                <Link to="/billing" className="em-lift" style={navButtonPrimary}>
                  Attiva il piano mensile
                </Link>
                <a
                  className="em-lift"
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={navButtonSecondary}
                >
                  Scrivici su WhatsApp
                </a>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <StepCard
                number="1"
                title="Carichi il menu"
                text="Categorie, prodotti, prezzi, immagini e varianti vengono organizzati in area admin."
              />
              <StepCard
                number="2"
                title="Generi i QR"
                text="Ogni tavolo riceve il suo QR e apre il menu con il numero tavolo già impostato."
              />
              <StepCard
                number="3"
                title="Ricevi ordini live"
                text="Cucina, bar e cassa vedono gli ordini in tempo reale e lavorano senza confusione."
              />
            </div>
          </div>
        </section>

        <section
          style={{
            background:
              "linear-gradient(135deg, rgba(18,59,107,0.98) 0%, rgba(29,78,216,0.92) 100%)",
            borderRadius: 30,
            padding: "34px 30px",
            color: "white",
            boxShadow: "0 24px 46px rgba(18,59,107,0.16)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 22,
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 40,
                  lineHeight: 1.05,
                  letterSpacing: "-0.04em",
                }}
              >
                Pronto per essere usato nel tuo ristorante.
              </h2>

              <p
                style={{
                  marginTop: 14,
                  marginBottom: 0,
                  fontSize: 17,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.88)",
                  maxWidth: 760,
                }}
              >
                Attiva il menu, genera i QR dei tavoli, ricevi ordini in tempo reale e gestisci
                cucina, bar, cassa, storico e statistiche in un unico flusso.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <Link to="/admin" className="em-lift" style={heroPrimaryButton}>
                Vai all’area admin
              </Link>
              <Link to="/dashboard" className="em-lift" style={heroSecondaryButton}>
                Apri dashboard
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                target="_blank"
                rel="noreferrer"
                className="em-lift"
                style={heroSecondaryButton}
              >
                WhatsApp
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const navLinkStyle = {
  textDecoration: "none",
  color: "#42658f",
  fontWeight: 850,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.52)",
  boxShadow: "0 8px 16px rgba(18,59,107,0.06)",
};

const navButtonPrimary = {
  textDecoration: "none",
  borderRadius: 14,
  padding: "12px 16px",
  background: "linear-gradient(135deg, #123b6b 0%, #2563eb 100%)",
  color: "white",
  fontWeight: 900,
  boxShadow: "0 12px 20px rgba(37,99,235,0.14)",
};

const navButtonSecondary = {
  textDecoration: "none",
  borderRadius: 14,
  padding: "12px 16px",
  background: "rgba(255,255,255,0.94)",
  color: "#123b6b",
  fontWeight: 900,
  border: "1px solid #dce8f6",
  boxShadow: "0 12px 22px rgba(18,59,107,0.10)",
};

const heroPrimaryButton = {
  textDecoration: "none",
  borderRadius: 18,
  padding: "16px 20px",
  background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
  color: "white",
  fontWeight: 900,
  fontSize: 16,
  boxShadow: "0 16px 26px rgba(16,185,129,0.20)",
};

const heroSecondaryButton = {
  textDecoration: "none",
  borderRadius: 18,
  padding: "16px 20px",
  background: "rgba(255,255,255,0.16)",
  color: "white",
  fontWeight: 900,
  fontSize: 16,
  border: "1px solid rgba(255,255,255,0.22)",
  boxShadow: "0 16px 26px rgba(0,0,0,0.12)",
  backdropFilter: "blur(10px)",
};

const demoRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  background: "#f4f9ff",
  borderRadius: 16,
  padding: "14px 16px",
  border: "1px solid #dce8f6",
  boxShadow: "0 10px 20px rgba(18,59,107,0.06)",
};

const demoTitleStyle = {
  fontWeight: 900,
  color: "#123b6b",
  fontSize: 16,
};

const demoSubStyle = {
  marginTop: 5,
  color: "#6480a6",
  fontSize: 13,
  fontWeight: 700,
};

const demoPriceStyle = {
  fontWeight: 900,
  color: "#0b2e59",
  whiteSpace: "nowrap",
  fontSize: 16,
};

const miniLabelStyle = {
  fontSize: 12,
  color: "#6480a6",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const miniValueStyle = {
  marginTop: 6,
  fontSize: 22,
  color: "#123b6b",
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const contactLinkStyle = {
  textDecoration: "none",
  color: "#123b6b",
  background: "#f4f9ff",
  border: "1px solid #dce8f6",
  borderRadius: 14,
  padding: "11px 12px",
  fontWeight: 900,
  boxShadow: "0 10px 18px rgba(18,59,107,0.07)",
};

const demoPrimaryButton = {
  textDecoration: "none",
  borderRadius: 16,
  padding: "14px 16px",
  background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
  color: "white",
  fontWeight: 950,
  textAlign: "center",
  boxShadow: "0 16px 26px rgba(16,185,129,0.22)",
};

const demoSecondaryButton = {
  textDecoration: "none",
  borderRadius: 16,
  padding: "14px 16px",
  background: "#ffffff",
  color: "#123b6b",
  fontWeight: 950,
  textAlign: "center",
  border: "1px solid #dce8f6",
  boxShadow: "0 14px 24px rgba(18,59,107,0.10)",
};

export default Landing;
