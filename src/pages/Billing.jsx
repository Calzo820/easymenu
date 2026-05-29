import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { appShellStyle, glowPageStyle } from "../styles/pageStyles";
import { createSubscriptionCheckout, getBillingStatus, openBillingPortal } from "../lib/api";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "—";
  }
}

const planDetails = {
  starter: {
    title: "Ristorante",
    price: "€49,99/mese",
    subtitle: "Piano unico per locali singoli: menu QR, ordini live, cucina, bar, cassa e dashboard.",
    features: ["Menu digitale responsive", "QR per tavolo", "Ordini live", "Cucina/bar/cassa", "Gestione menu e tavoli"],
  },
  enterprise: {
    title: "Catene e gruppi",
    price: "Su misura",
    subtitle: "Per più sedi, brand con esigenze avanzate, ruoli, supporto e setup dedicato.",
    features: ["Multi-ristorante", "Supporto configurazione", "Ruoli avanzati", "Integrazioni personalizzate"],
  },
};

function PlanCard({ id, currentPlan, loadingPlan, onCheckout }) {
  const plan = planDetails[id];
  const active = currentPlan === id;
  const recommended = id === "starter";

  return (
    <div
      className="section-card"
      style={{
        border: active ? "2px solid #22c55e" : recommended ? "2px solid #2563eb" : "1px solid #e5e7eb",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {recommended ? (
        <div style={badgeStyle}>Consigliato</div>
      ) : null}
      {active ? <div style={{ ...badgeStyle, background: "#16a34a" }}>Attivo</div> : null}

      <div style={{ fontSize: 24, fontWeight: 950, color: "#111827" }}>{plan.title}</div>
      <div style={{ marginTop: 8, fontSize: 30, fontWeight: 950, color: "#0f172a" }}>{plan.price}</div>
      <p style={{ color: "#64748b", lineHeight: 1.55, minHeight: 48 }}>{plan.subtitle}</p>

      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        {plan.features.map((feature) => (
          <div key={feature} style={{ display: "flex", gap: 8, alignItems: "center", color: "#334155", fontWeight: 700 }}>
            <span style={{ color: "#16a34a" }}>✓</span>
            {feature}
          </div>
        ))}
      </div>

      <button
        disabled={active || loadingPlan === id}
        onClick={() => id === "enterprise" ? window.open("https://wa.me/3240467723?text=Ciao%2C%20vorrei%20informazioni%20su%20EasyMenu%20per%20catene%20o%20pi%C3%B9%20ristoranti.", "_blank") : onCheckout(id)}
        style={{
          marginTop: 22,
          width: "100%",
          border: "none",
          borderRadius: 16,
          padding: "14px 16px",
          background: active ? "#dcfce7" : recommended ? "#2563eb" : "#111827",
          color: active ? "#166534" : "white",
          fontWeight: 950,
          cursor: active ? "default" : "pointer",
          opacity: loadingPlan === id ? 0.7 : 1,
        }}
      >
        {id === "enterprise" ? "Parla con noi" : active ? "Piano attuale" : loadingPlan === id ? "Apro Stripe..." : "Vai al pagamento"}
      </button>
    </div>
  );
}

export default function Billing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingPlan, setLoadingPlan] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const queryStatus = searchParams.get("billing");
  const requestedPlan = searchParams.get("plan");

  async function load() {
    try {
      setLoading(true);
      const res = await getBillingStatus();
      setData(res);
      setError("");
    } catch (err) {
      setError(err.message || "Errore caricamento billing");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (requestedPlan === "starter") {
      handleCheckout("starter");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedPlan]);

  async function handleCheckout(plan) {
    try {
      setLoadingPlan(plan);
      const res = await createSubscriptionCheckout(plan);
      if (res?.checkoutUrl) window.location.href = res.checkoutUrl;
    } catch (err) {
      setError(err.message || "Errore apertura checkout");
    } finally {
      setLoadingPlan("");
    }
  }

  async function handlePortal() {
    try {
      setPortalLoading(true);
      const res = await openBillingPortal();
      if (res?.portalUrl) window.location.href = res.portalUrl;
    } catch (err) {
      setError(err.message || "Errore apertura portale Stripe");
    } finally {
      setPortalLoading(false);
    }
  }

  const currentPlan = data?.subscription?.plan || data?.restaurant?.plan || "";
  const status = data?.subscription?.status || "trialing";

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div style={appShellStyle}>
        <div className="app-shell">
          <div className="glass-hero" style={{ marginBottom: 18 }}>
            <div className="topbar-chip" style={{ marginBottom: 12 }}>
              <span className="status-dot" style={{ background: "#22c55e" }} />
              SaaS billing
            </div>
            <h1 style={{ margin: 0, fontSize: 38, letterSpacing: "-0.04em" }}>Abbonamento ristorante</h1>
            <p style={{ color: "rgba(255,255,255,0.88)", lineHeight: 1.65, maxWidth: 760 }}>
              Gestisci il piano del ristoratore, attiva prova gratuita, upgrade, downgrade e portale Stripe per fatture e metodo di pagamento.
            </p>
          </div>

          {queryStatus === "success" ? <div style={successBox}>Pagamento abbonamento avviato correttamente. Stripe aggiornerà lo stato via webhook.</div> : null}
          {queryStatus === "cancelled" ? <div style={warnBox}>Checkout annullato. Puoi riprovare quando vuoi.</div> : null}
          {error ? <div style={errorBox}>{error}</div> : null}

          <div className="section-card" style={{ marginBottom: 18 }}>
            <div className="panel-title">Stato attuale</div>
            {loading ? (
              <div className="panel-subtitle">Caricamento...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
                <InfoBox label="Ristorante" value={data?.restaurant?.name || "—"} />
                <InfoBox label="Piano" value={currentPlan} />
                <InfoBox label="Stato" value={status} />
                <InfoBox label="Rinnovo" value={formatDate(data?.subscription?.currentPeriodEnd)} />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <button onClick={load} style={secondaryBtn}>Aggiorna stato</button>
              <button onClick={handlePortal} disabled={portalLoading} style={primaryBtn}>
                {portalLoading ? "Apro portale..." : "Apri portale Stripe"}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {["starter", "enterprise"].map((id) => (
              <PlanCard key={id} id={id} currentPlan={currentPlan} loadingPlan={loadingPlan} onCheckout={handleCheckout} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 850 }}>{label}</div>
      <div style={{ color: "#111827", fontSize: 22, fontWeight: 950, marginTop: 6, textTransform: "capitalize" }}>{value}</div>
    </div>
  );
}

const badgeStyle = {
  position: "absolute",
  right: 14,
  top: 14,
  background: "#2563eb",
  color: "white",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 950,
};

const primaryBtn = {
  border: "none",
  borderRadius: 14,
  padding: "12px 16px",
  background: "#111827",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtn = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "12px 16px",
  background: "white",
  color: "#111827",
  fontWeight: 900,
  cursor: "pointer",
};

const successBox = { marginBottom: 14, padding: 14, borderRadius: 16, background: "#dcfce7", color: "#166534", fontWeight: 850 };
const warnBox = { marginBottom: 14, padding: 14, borderRadius: 16, background: "#fef3c7", color: "#92400e", fontWeight: 850 };
const errorBox = { marginBottom: 14, padding: 14, borderRadius: 16, background: "#fee2e2", color: "#991b1b", fontWeight: 850 };
