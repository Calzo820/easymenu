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
Patatine fritte;4;Contorni;kitchen;Porzione singola;
Acqua frizzante;2.5;Bevande;bar;Bottiglia 0,75;
Calice vino rosso;5;Vini;bar;Selezione della casa;solfiti`;

function StepCard({ done, title, text, children }) {
  return (
    <div className={`onb-card ${done ? "is-done" : ""}`}>
      <div className="onb-card-head">
        <div className="onb-check">{done ? "✓" : "•"}</div>
        <div>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      </div>
      {children ? <div className="onb-card-body">{children}</div> : null}
    </div>
  );
}

function parseBaseUrl() {
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
  const [seats, setSeats] = useState(4);
  const [zoneMode, setZoneMode] = useState("sala");
  const [importText, setImportText] = useState(DEMO_IMPORT);
  const [showQrPreview, setShowQrPreview] = useState(false);

  const progress = status?.progress || 0;
  const restaurant = status?.restaurant;
  const checks = status?.checks || {};
  const counts = status?.counts || {};

  const qrLinks = useMemo(() => {
    const base = parseBaseUrl();
    const slug = qrPayload?.restaurant?.slug || restaurant?.slug;
    return (qrPayload?.tables || []).map((table) => ({ ...table, link: `${base}/menu/${slug}/${table.qrToken}` }));
  }, [qrPayload, restaurant]);

  async function load() {
    try {
      setError("");
      const [nextStatus, nextQr] = await Promise.all([apiGet("/onboarding/status"), apiGet("/onboarding/qr-payload")]);
      setStatus(nextStatus);
      setQrPayload(nextQr);
    } catch (err) {
      setError(err.message || "Errore caricamento onboarding");
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
      const result = await apiPost("/onboarding/auto-setup", { tablesCount: Number(tablesCount), seats: Number(seats), zoneMode, createDemoMenu: true, overwriteEmptyOnly: true });
      setMessage(`Setup completato: ${result.tablesCreated || 0} tavoli creati, ${result.demoMenuCreated || 0} prodotti demo aggiunti.`);
      await load();
    } catch (err) {
      setError(err.message || "Errore setup automatico");
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
      setMessage(`Import completato: ${result.imported || 0} prodotti inseriti, ${result.skipped || 0} duplicati saltati.`);
      await load();
    } catch (err) {
      setError(err.message || "Errore import menu");
    } finally {
      setWorking(false);
    }
  }

  async function markReviewed() {
    try {
      setWorking(true);
      const result = await apiPost("/onboarding/step", { step: "reviewed", value: true });
      setStatus(result);
      setMessage("Setup segnato come pronto per servizio reale.");
    } catch (err) {
      setError(err.message || "Errore salvataggio completamento");
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
        <div className="app-shell onb-shell">
          <section className="onb-hero">
            <div>
              <span className="onb-pill">🚀 Setup ristorante guidato</span>
              <h1>Onboarding rapido per {restaurant?.name || "il tuo locale"}</h1>
              <p>Configura tavoli, QR, menu demo/import e checklist in pochi minuti, pronto per il primo servizio reale.</p>
            </div>
            <div className="onb-progress-box">
              <div className="onb-progress-number">{progress}%</div>
              <div className="onb-progress-track"><span style={{ width: `${progress}%` }} /></div>
              <div className="onb-progress-label">{status?.completed ? "Configurazione completa" : "Setup in corso"}</div>
            </div>
          </section>

          {error ? <div className="onb-alert danger">{error}</div> : null}
          {message ? <div className="onb-alert success">{message}</div> : null}
          {loading ? <div className="onb-card">Caricamento onboarding...</div> : null}

          <div className="onb-grid">
            <StepCard done={checks.profile} title="1. Profilo locale" text="Nome, slug e dati base del ristorante già collegati all’account.">
              <div className="onb-summary">
                <b>{restaurant?.name}</b>
                <span>Slug pubblico: /menu/{restaurant?.slug || "slug"}</span>
              </div>
            </StepCard>

            <StepCard done={checks.tables} title="2. Tavoli automatici" text="Crea subito tavoli numerati con token QR univoco.">
              <div className="onb-form-row">
                <label>Numero tavoli<input type="number" min="1" max="200" value={tablesCount} onChange={(e) => setTablesCount(e.target.value)} /></label>
                <label>Coperti default<input type="number" min="1" max="20" value={seats} onChange={(e) => setSeats(e.target.value)} /></label>
                <label>Zone<select value={zoneMode} onChange={(e) => setZoneMode(e.target.value)}><option value="sala">Solo sala</option><option value="zones">Sala + dehors</option></select></label>
              </div>
              <button className="onb-primary" disabled={working} onClick={runAutoSetup}>{working ? "Configuro..." : "Crea tavoli + menu demo"}</button>
              <small>{counts.activeTables || 0} tavoli attivi ora.</small>
            </StepCard>

            <StepCard done={checks.qr} title="3. QR PDF" text="Genera una stampa PDF con un QR grande per ogni tavolo.">
              <div className="onb-actions">
                <button className="onb-secondary" onClick={() => setShowQrPreview((v) => !v)}>{showQrPreview ? "Nascondi anteprima" : "Anteprima QR"}</button>
                <button className="onb-primary" disabled={!qrLinks.length} onClick={printQrPdf}>Genera/Stampa PDF QR</button>
              </div>
              <small>{qrLinks.length} QR pronti. In stampa scegli “Salva come PDF”.</small>
            </StepCard>

            <StepCard done={checks.menu} title="4. Menu demo precompilato" text="Il setup automatico inserisce prodotti reali divisi tra cucina e bar.">
              <div className="onb-summary"><b>{counts.menuItems || 0} prodotti menu</b><span>Pizze, primi, secondi, bevande, cocktail e caffetteria.</span></div>
            </StepCard>

            <StepCard done={checks.import} title="5. Import veloce menu" text="Incolla righe CSV/Excel: nome;prezzo;categoria;area;descrizione;allergeni.">
              <textarea className="onb-textarea" value={importText} onChange={(e) => setImportText(e.target.value)} rows={8} />
              <button className="onb-primary" disabled={working} onClick={importMenu}>{working ? "Importo..." : "Importa menu"}</button>
            </StepCard>

            <StepCard done={checks.reviewed} title="6. Completamento setup" text="Conferma quando tavoli, QR e menu sono pronti per lo staff.">
              <div className="onb-checklist">
                <span className={checks.tables ? "ok" : ""}>Tavoli creati</span>
                <span className={checks.qr ? "ok" : ""}>QR disponibili</span>
                <span className={checks.menu ? "ok" : ""}>Menu caricato</span>
              </div>
              <button className="onb-primary" disabled={working || !checks.tables || !checks.menu} onClick={markReviewed}>Segna setup completato</button>
            </StepCard>
          </div>

          {showQrPreview ? (
            <section className="onb-print-area">
              <div className="onb-print-title">
                <h2>{restaurant?.name || "Ristorante"} · QR Tavoli</h2>
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
        </div>
      </div>
    </div>
  );
}
