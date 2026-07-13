import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Navbar from "../components/Navbar";
import { apiGet, apiPost } from "../lib/api";
import { appShellStyle, glowPageStyle } from "../styles/pageStyles";
import "../styles/onboarding.css";

const DEMO_IMPORT = `nome;prezzo;categoria;area;descrizione;allergeni
Bruschetta classica;5;Antipasti;kitchen;Pomodoro basilico e olio EVO;glutine
Carbonara;12;Primi;kitchen;Guanciale uova pecorino;glutine,uova,latte
Grigliata mista;18;Secondi;kitchen;Carne mista alla griglia;
Acqua frizzante;2.5;Bevande;bar;Bottiglia 0,75;
Calice vino rosso;5;Vini;bar;Selezione della casa;solfiti`;

function StepCard({ done, title, text, children }) {
  return (
    <article className={`onb-card ${done ? "is-done" : ""}`}>
      <div className="onb-card-head">
        <div className="onb-check">{done ? "OK" : "..."}</div>
        <div>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      </div>
      {children ? <div className="onb-card-body">{children}</div> : null}
    </article>
  );
}

function baseUrl() {
  return window.location.origin;
}

export default function Onboarding() {
  const [status, setStatus] = useState(null);
  const [qrPayload, setQrPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tablesCount, setTablesCount] = useState(20);
  const [importText, setImportText] = useState(DEMO_IMPORT);
  const [showQrPreview, setShowQrPreview] = useState(false);

  const progress = status?.progress || 0;
  const restaurant = status?.restaurant;
  const checks = status?.checks || {};
  const counts = status?.counts || {};

  const qrLinks = useMemo(() => {
    const slug = qrPayload?.restaurant?.slug || restaurant?.slug;
    return (qrPayload?.tables || []).map((table) => ({ ...table, link: `${baseUrl()}/menu/${slug}/${table.qrToken}` }));
  }, [qrPayload, restaurant]);

  async function load() {
    try {
      setError("");
      const [nextStatus, nextQr] = await Promise.all([apiGet("/onboarding/status"), apiGet("/onboarding/qr-payload")]);
      setStatus(nextStatus);
      setQrPayload(nextQr);
    } catch (err) {
      setError(err.message || "Errore caricamento setup");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function runAutoSetup() {
    try {
      setWorking(true);
      setError("");
      setMessage("");
      const result = await apiPost("/onboarding/auto-setup", {
        tablesCount: Number(tablesCount),
        seats: 4,
        zoneMode: "sala",
        createDemoMenu: false,
        overwriteEmptyOnly: true,
      });
      setMessage(`Tavoli creati: ${result.tablesCreated || 0}.`);
      await load();
    } catch (err) {
      setError(err.message || "Errore creazione tavoli");
    } finally {
      setWorking(false);
    }
  }

  async function importMenu() {
    try {
      setWorking(true);
      setError("");
      setMessage("");
      const result = await apiPost("/onboarding/import-menu", { text: importText });
      setMessage(`Prodotti importati: ${result.imported || 0}. Duplicati saltati: ${result.skipped || 0}.`);
      await load();
    } catch (err) {
      setError(err.message || "Errore import menu");
    } finally {
      setWorking(false);
    }
  }

  function printQrPdf() {
    setShowQrPreview(true);
    setTimeout(() => window.print(), 150);
  }

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div style={appShellStyle}>
        <main className="app-shell onb-shell">
          <section className="onb-hero">
            <div>
              <span className="onb-pill">Setup guidato</span>
              <h1>Completa EasyMenu</h1>
              <p>Configura solo cio che serve per iniziare: profilo, tavoli, menu, QR e abbonamento. Lo staff separato e opzionale.</p>
            </div>
            <div className="onb-progress-box">
              <div className="onb-progress-number">{progress}%</div>
              <div className="onb-progress-track"><span style={{ width: `${progress}%` }} /></div>
              <div className="onb-progress-label">Setup completato al {progress}%</div>
            </div>
          </section>

          {error ? <div className="onb-alert danger">{error}</div> : null}
          {message ? <div className="onb-alert success">{message}</div> : null}
          {loading ? <div className="onb-card">Caricamento setup...</div> : null}

          <section className="onb-grid">
            <StepCard done={checks.profile} title="1. Nome e logo ristorante" text="Controlla identita, colore, valuta e logo nella pagina Impostazioni.">
              <div className="onb-summary">
                <b>{restaurant?.name || "Ristorante"}</b>
                <span>Slug pubblico: /menu/{restaurant?.slug || "slug"}</span>
              </div>
              <button className="onb-secondary" type="button" onClick={() => { window.location.href = "/admin?tab=settings"; }}>Apri profilo</button>
            </StepCard>

            <StepCard done={checks.tables} title="2. Crea tavoli" text="Genera tavoli numerati e QR. Coperti e zone non servono per partire.">
              <div className="onb-form-row">
                <label>Numero tavoli<input type="number" min="1" max="200" value={tablesCount} onChange={(event) => setTablesCount(event.target.value)} /></label>
              </div>
              <button className="onb-primary" disabled={working} onClick={runAutoSetup}>{working ? "Creo..." : "Crea tavoli"}</button>
              <small>{counts.activeTables || 0} tavoli attivi.</small>
            </StepCard>

            <StepCard done={checks.menu} title="3. Aggiungi prodotti" text="Importa prodotti con categorie, area cucina/bar, descrizione e allergeni.">
              <textarea className="onb-textarea" value={importText} onChange={(event) => setImportText(event.target.value)} rows={8} />
              <button className="onb-primary" disabled={working} onClick={importMenu}>{working ? "Importo..." : "Importa prodotti"}</button>
              <small>{counts.menuItems || 0} prodotti nel menu.</small>
            </StepCard>

            <StepCard done title="4. Staff opzionale" text="No, non devi registrare subito piu mail. Puoi partire con l'account owner e aggiungere ruoli cucina, bar o cassa piu avanti.">
              <div className="onb-summary"><b>{counts.staff || 0} accessi operativi</b><span>Consigliato solo quando il ristorante vuole tablet separati per cucina, bar o cassa.</span></div>
              <button className="onb-secondary" type="button" onClick={() => { window.location.href = "/admin?tab=staff"; }}>Configura piu avanti</button>
            </StepCard>

            <StepCard done={checks.qr} title="5. Genera QR" text="Stampa i QR per i tavoli e fai provare subito il menu cliente.">
              <div className="onb-actions">
                <button className="onb-secondary" onClick={() => setShowQrPreview((value) => !value)}>{showQrPreview ? "Nascondi anteprima" : "Anteprima QR"}</button>
                <button className="onb-primary" disabled={!qrLinks.length} onClick={printQrPdf}>Stampa PDF QR</button>
              </div>
              <small>{qrLinks.length} QR pronti.</small>
            </StepCard>

            <StepCard done={checks.billing} title="6. Attiva abbonamento" text="Verifica piano, rinnovo, portale Stripe, IVA e stato ristorante.">
              <div className="onb-checklist">
                <span className={checks.profile ? "ok" : ""}>Profilo</span>
                <span className={checks.tables ? "ok" : ""}>Tavoli</span>
                <span className={checks.menu ? "ok" : ""}>Menu</span>
                <span className={checks.qr ? "ok" : ""}>QR</span>
              </div>
              <button className="onb-primary" type="button" onClick={() => { window.location.href = "/billing"; }}>Apri abbonamento</button>
            </StepCard>
          </section>

          {showQrPreview ? (
            <section className="onb-print-area">
              <div className="onb-print-title">
                <h2>{restaurant?.name || "Ristorante"} - QR Tavoli</h2>
                <p>Scansiona per ordinare dal tavolo.</p>
              </div>
              <div className="onb-qr-grid">
                {qrLinks.map((table) => (
                  <div className="onb-qr-card" key={table.id}>
                    <h3>{table.name}</h3>
                    <QRCodeCanvas value={table.link} size={180} includeMargin />
                    <p>{table.link}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
