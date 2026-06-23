import Navbar from "../components/Navbar.jsx";

const integrations = [
  ["SumUp", "Pagamenti", "Alta", "Pianificata", "Incasso al tavolo e riconciliazione pagamenti."],
  ["Nexi", "Pagamenti", "Alta", "Pianificata", "Gateway carta e online con webhook esito pagamento."],
  ["Fatture in Cloud", "Fiscale", "Alta", "Pianificata", "Export fiscale e documenti contabili."],
  ["Tilby", "POS", "Media", "Discovery", "Sincronizzazione articoli, reparti e ordini."],
  ["Cassa in Cloud", "POS", "Media", "Discovery", "EasyMenu collegato al gestionale gia presente."],
  ["TheFork", "Prenotazioni", "Media", "Discovery", "Prenotazioni collegate a tavoli, turni e coperti."],
  ["Deliveroo", "Delivery", "Bassa", "Discovery", "Ordini delivery nella stessa coda cucina."],
  ["Glovo", "Delivery", "Bassa", "Discovery", "Meno tablet separati e meno errori operativi."],
];

const statusClass = {
  Pianificata: "#dbeafe",
  Discovery: "#f1f5f9",
};

export default function Integrazioni() {
  return (
    <>
      <Navbar />
      <main className="app-shell">
        <section className="glass-hero">
          <div className="topbar-chip">Roadmap competitiva</div>
          <h1 style={{ fontSize: "clamp(34px, 6vw, 62px)", letterSpacing: "-0.04em", lineHeight: 0.98, marginTop: 18 }}>
            Integrazioni che rendono EasyMenu piu difficile da sostituire.
          </h1>
          <p className="panel-subtitle" style={{ maxWidth: 820, fontSize: 18, lineHeight: 1.65 }}>
            Una vista chiara per decidere cosa collegare prima: pagamenti, fiscale, POS, prenotazioni e delivery.
          </p>
        </section>

        <section className="section-card" style={{ marginTop: 22, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: 14 }}>Provider</th>
                <th style={{ padding: 14 }}>Area</th>
                <th style={{ padding: 14 }}>Priorita</th>
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
                  <td style={{ padding: 14 }}>
                    <span className="metric-badge" style={{ background: statusClass[status] || "#f1f5f9" }}>{status}</span>
                  </td>
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
