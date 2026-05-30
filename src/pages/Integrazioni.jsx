import Navbar from "../components/Navbar.jsx";

const integrations = [
  ["SumUp", "Pagamenti", "Alta", "planned", "Incasso al tavolo e riconciliazione pagamenti."],
  ["Nexi", "Pagamenti", "Alta", "planned", "Gateway carta/online con webhook esito pagamento."],
  ["Fatture in Cloud", "Fiscale", "Alta", "planned", "Export fiscale e documenti contabili."],
  ["Tilby", "POS", "Media", "discovery", "Sincronizzazione articoli, reparti e ordini."],
  ["Cassa in Cloud", "POS", "Media", "discovery", "Innestare EasyMenu sul gestionale esistente."],
  ["TheFork", "Prenotazioni", "Media", "discovery", "Prenotazioni collegate a tavoli e turni."],
  ["Deliveroo", "Delivery", "Bassa", "discovery", "Ordini delivery nella stessa cucina."],
  ["Glovo", "Delivery", "Bassa", "discovery", "Meno tablet separati e meno errori."],
];

export default function Integrazioni() {
  return (
    <>
      <Navbar />
      <main className="app-shell">
        <section className="glass-hero">
          <div className="topbar-chip">Roadmap competitiva</div>
          <h1 style={{ fontSize: "clamp(34px, 6vw, 62px)", letterSpacing: "-0.06em", lineHeight: 0.95, marginTop: 18 }}>
            Integrazioni che fanno cambiare software a un ristoratore.
          </h1>
          <p className="panel-subtitle" style={{ maxWidth: 820, fontSize: 18, lineHeight: 1.65 }}>
            Questa schermata distingue tra integrazioni attive, pianificate e in discovery. È una base prodotto seria: non promette API non ancora collegate e chiarisce cosa serve per renderle operative.
          </p>
        </section>

        <section className="section-card" style={{ marginTop: 22, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: 14 }}>Provider</th>
                <th style={{ padding: 14 }}>Area</th>
                <th style={{ padding: 14 }}>Priorità</th>
                <th style={{ padding: 14 }}>Stato</th>
                <th style={{ padding: 14 }}>Impatto business</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map(([name, area, priority, status, impact]) => (
                <tr key={name} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: 14, fontWeight: 900 }}>{name}</td>
                  <td style={{ padding: 14 }}>{area}</td>
                  <td style={{ padding: 14 }}>{priority}</td>
                  <td style={{ padding: 14 }}><span className="metric-badge">{status}</span></td>
                  <td style={{ padding: 14, color: "#475569" }}>{impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
