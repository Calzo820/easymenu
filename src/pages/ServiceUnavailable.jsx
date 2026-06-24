import { Link } from "react-router-dom";

export default function ServiceUnavailable({ message = "" }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 22,
        background: "linear-gradient(180deg, #eef6ff 0%, #f8fafc 100%)",
        color: "#0f172a",
      }}
    >
      <section
        style={{
          width: "min(620px, 100%)",
          borderRadius: 28,
          background: "white",
          border: "1px solid #e2e8f0",
          boxShadow: "0 26px 70px rgba(15,23,42,.12)",
          padding: 28,
        }}
      >
        <span style={{ display: "inline-flex", borderRadius: 999, padding: "8px 11px", background: "#fef3c7", color: "#92400e", fontWeight: 950 }}>
          Servizio in riavvio
        </span>
        <h1 style={{ margin: "16px 0 8px", fontSize: 34, letterSpacing: "-0.05em" }}>
          Servizio temporaneamente non disponibile
        </h1>
        <p style={{ margin: 0, color: "#475569", fontWeight: 750, lineHeight: 1.55 }}>
          Il backend potrebbe essere in avvio o momentaneamente non raggiungibile. La sessione resta salvata: riprova tra qualche secondo.
        </p>
        {message ? <p style={{ marginTop: 12, color: "#991b1b", fontWeight: 850 }}>{message}</p> : null}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ border: 0, borderRadius: 14, padding: "12px 16px", background: "#0f172a", color: "white", fontWeight: 950, cursor: "pointer" }}
          >
            Riprova
          </button>
          <Link to="/demo" style={{ borderRadius: 14, padding: "12px 16px", background: "#eef2ff", color: "#1d4ed8", fontWeight: 950, textDecoration: "none" }}>
            Apri demo
          </Link>
          <Link to="/" style={{ borderRadius: 14, padding: "12px 16px", background: "#f8fafc", color: "#334155", fontWeight: 950, textDecoration: "none" }}>
            Torna alla home
          </Link>
        </div>
      </section>
    </main>
  );
}
