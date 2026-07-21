import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "../components/Navbar";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import { imageFileToDataUrl } from "../lib/imageFiles";
import { appShellStyle, glowPageStyle } from "../styles/pageStyles";
import "../styles/onboarding.css";

const DEMO_IMPORT = `nome;prezzo;categoria;cucina_o_bar;descrizione;allergeni
Bruschetta classica;5;Antipasti;kitchen;Pomodoro basilico e olio EVO;glutine
Carbonara;12;Primi;kitchen;Guanciale uova pecorino;glutine,uova,latte
Grigliata mista;18;Secondi;kitchen;Carne mista alla griglia;
Acqua frizzante;2.5;Bevande;bar;Bottiglia 0,75;
Calice vino rosso;5;Vini;bar;Selezione della casa;solfiti`;

function SetupActionCard({ done, kicker, title, text, children }) {
  return (
    <article className={`onb-action-card ${done ? "is-done" : ""}`}>
      <div className="onb-action-head">
        <div className="onb-check">{done ? "OK" : "..."}</div>
        <div>
          <span className="onb-action-kicker">{kicker}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      </div>
      {children ? <div className="onb-action-body">{children}</div> : null}
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
  const [logoUrl, setLogoUrl] = useState("");
  const [savingLogo, setSavingLogo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const restaurant = status?.restaurant;
  const checks = status?.checks || {};
  const counts = status?.counts || {};

  const commandSteps = [
    {
      number: 1,
      title: "Logo",
      detail: checks.profile ? "Caricato" : "Da completare",
      done: Boolean(checks.profile),
      current: !checks.profile,
    },
    {
      number: 2,
      title: "Crea tavoli",
      detail: `${counts.activeTables || 0} attivi`,
      done: Boolean(checks.tables),
      current: checks.profile && !checks.tables,
    },
    {
      number: 3,
      title: "Aggiungi prodotti",
      detail: `${counts.menuItems || 0} prodotti`,
      done: Boolean(checks.menu),
      current: checks.profile && checks.tables && !checks.menu,
    },
    {
      number: 4,
      title: "Stampa QR",
      detail: `${qrPayload?.tables?.length || 0} pronti`,
      done: Boolean(checks.qr),
      current: checks.profile && checks.tables && checks.menu && !checks.qr,
    },
  ];
  const progress = Math.round((commandSteps.filter((step) => step.done).length / commandSteps.length) * 100);

  const qrLinks = useMemo(() => {
    const slug = qrPayload?.restaurant?.slug || restaurant?.slug;
    return (qrPayload?.tables || []).map((table) => ({ ...table, link: `${baseUrl()}/menu/${slug}/${table.qrToken}` }));
  }, [qrPayload, restaurant]);

  const setupCoach = useMemo(() => {
    if (loading) return null;

    if (!checks.profile) {
      return {
        tone: "brand",
        title: "Parti dal logo",
        text: "Il menu cliente deve sembrare del ristorante, non una demo generica. Carica il logo dal PC e salvalo.",
        actionLabel: "Carica logo",
        action: () => document.querySelector(".onb-logo-card")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      };
    }

    if (!checks.tables) {
      return {
        tone: "tables",
        title: "Crea la sala",
        text: "Prepara tutti i tavoli prima di stampare i QR. Per la demo commerciale consiglio almeno 20 tavoli.",
        actionLabel: "Crea tavoli",
        action: runAutoSetup,
      };
    }

    if (!checks.menu) {
      return {
        tone: "menu",
        title: "Completa il menu",
        text: "Aggiungi almeno antipasti, primi, secondi, dolci e bevande. Le foto dei piatti fanno molta differenza nella prova.",
        actionLabel: "Aggiungi prodotti",
        action: importMenu,
      };
    }

    if (!checks.qr || qrLinks.length === 0) {
      return {
        tone: "qr",
        title: "Prepara i QR",
        text: "Quando tavoli e menu sono pronti, stampa i QR e prova un ordine reale dal telefono.",
        actionLabel: "Anteprima QR",
        action: () => setShowQrPreview(true),
      };
    }

    return {
      tone: "done",
      title: "Pronto per il servizio",
      text: "Logo, tavoli, menu e QR sono allineati. Ora puoi provare il flusso con menu cliente, cucina e cassa.",
      actionLabel: "Rivedi QR",
      action: () => setShowQrPreview(true),
    };
  }, [checks.menu, checks.profile, checks.qr, checks.tables, loading, qrLinks.length]);

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

  useEffect(() => {
    setLogoUrl(restaurant?.logoUrl || "");
  }, [restaurant?.logoUrl]);

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
      const activeTables = result.status?.counts?.activeTables || result.activeTablesAfter || 0;
      const created = Number(result.tablesCreated || 0);
      const reactivated = Number(result.tablesReactivated || 0);
      if (activeTables > 0) {
        setMessage(`Sala pronta: ${activeTables} tavoli attivi. Nuovi: ${created}. Riattivati: ${reactivated}.`);
      } else {
        setError("Non ho trovato tavoli attivi dopo la creazione. Riprova o contattaci.");
      }
      if (result.status) setStatus(result.status);
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
      const imported = Number(result.imported || 0);
      const skipped = Number(result.skipped || 0);
      if (imported > 0) {
        setMessage(`Prodotti aggiunti al menu: ${imported}. Gia presenti: ${skipped}.`);
      } else {
        setMessage(`Nessun nuovo prodotto aggiunto: ${skipped} erano gia presenti nel menu.`);
      }
      if (result.status) setStatus(result.status);
      await load();
    } catch (err) {
      setError(err.message || "Errore import menu");
    } finally {
      setWorking(false);
    }
  }

  async function handleLogoFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      setError("");
      const dataUrl = await imageFileToDataUrl(file, { maxWidth: 900, maxHeight: 900, quality: 0.84 });
      setLogoUrl(dataUrl);
      setMessage("Logo caricato. Premi Salva logo per pubblicarlo nel menu cliente.");
    } catch (err) {
      setError(err.message || "Errore caricamento logo");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }

  async function saveLogo() {
    try {
      setSavingLogo(true);
      setError("");
      setMessage("");
      const response = await apiPatch("/restaurants/me", { logoUrl: logoUrl.trim() || null });
      if (response?.restaurant) {
        localStorage.setItem("auth_restaurant", JSON.stringify(response.restaurant));
        localStorage.setItem("ristorante_attivo", response.restaurant.name || "");
      }
      setMessage("Logo ristorante salvato.");
      await load();
    } catch (err) {
      setError(err.message || "Errore salvataggio logo");
    } finally {
      setSavingLogo(false);
    }
  }

  function printQrPdf() {
    if (!qrLinks.length) return;
    setShowQrPreview(true);
    setTimeout(() => window.print(), 350);
  }

  function openQrPreview() {
    setShowQrPreview(true);
  }

  return (
    <div style={glowPageStyle}>
      <Navbar />
      <div style={appShellStyle}>
        <main className="app-shell onb-shell">
          <section className="onb-hero">
            <div>
              <span className="onb-pill">Setup servizio</span>
              <h1>Prepara il ristorante in pochi minuti.</h1>
              <p>{restaurant?.name || "Il ristorante"} deve fare quattro cose per partire: logo, tavoli, menu e QR. Lo staff separato resta opzionale.</p>
            </div>
            <div className="onb-progress-box">
              <div className="onb-progress-number">{progress}%</div>
              <div className="onb-progress-track"><span style={{ width: `${progress}%` }} /></div>
              <div className="onb-progress-label">Prontezza servizio</div>
            </div>
          </section>

          {error ? <div className="onb-alert danger">{error}</div> : null}
          {message ? <div className="onb-alert success">{message}</div> : null}
          {loading ? <div className="onb-card">Caricamento setup...</div> : null}

          <section className="onb-command-strip">
            {commandSteps.map((step) => (
              <article
                className={`onb-command-card ${step.done ? "is-done" : ""} ${step.current ? "is-current" : ""}`}
                key={step.number}
              >
                <span>{step.number}</span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </article>
            ))}
          </section>

          {setupCoach ? (
            <section className={`onb-coach-card ${setupCoach.tone}`}>
              <div>
                <span>Assistente setup</span>
                <h2>{setupCoach.title}</h2>
                <p>{setupCoach.text}</p>
              </div>
              <button type="button" className="onb-primary" onClick={setupCoach.action} disabled={working}>
                {working ? "Attendi..." : setupCoach.actionLabel}
              </button>
            </section>
          ) : null}

          <section className="onb-service-grid">
            <SetupActionCard done={checks.profile} kicker="Passo 1" title="Logo ristorante" text="Carica il logo dal PC: comparira nel menu cliente e nei QR." >
              <div className="onb-logo-card">
                <div className="onb-logo-preview">
                  {logoUrl ? <img src={logoUrl} alt="Logo ristorante" /> : <span>{restaurant?.name?.slice(0, 1) || "E"}</span>}
                </div>
                <div className="onb-logo-tools">
                  <input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="URL logo oppure carica da PC" />
                  <div className="onb-actions">
                    <label className="onb-file-button">
                      {uploadingLogo ? "Carico..." : "Carica da PC"}
                      <input type="file" accept="image/*" onChange={handleLogoFile} disabled={uploadingLogo} />
                    </label>
                    <button className="onb-primary" type="button" onClick={saveLogo} disabled={savingLogo || uploadingLogo}>{savingLogo ? "Salvo..." : "Salva logo"}</button>
                  </div>
                </div>
              </div>
            </SetupActionCard>

            <SetupActionCard done={checks.tables} kicker="Passo 2" title="Tavoli" text="Inserisci quanti tavoli vuoi creare. Niente coperti, niente zone: solo numeri tavolo.">
              <div className="onb-form-row">
                <label>Numero tavoli<input type="number" min="1" max="200" value={tablesCount} onChange={(event) => setTablesCount(event.target.value)} /></label>
              </div>
              <button className="onb-primary" disabled={working} onClick={runAutoSetup}>{working ? "Creo..." : "Crea tavoli"}</button>
              <small>{counts.activeTables || 0} tavoli attivi.</small>
            </SetupActionCard>

            <SetupActionCard done={checks.menu} kicker="Passo 3" title="Prodotti menu" text="Scrivi o lascia gli esempi qui sotto: ogni riga diventa un piatto o una bevanda nella pagina Menu.">
              <div className="onb-menu-help">
                <strong>Come funziona</strong>
                <span>Formato riga: nome; prezzo; categoria; kitchen oppure bar; descrizione; allergeni.</span>
                <span>Esempio: Carbonara;12;Primi;kitchen;Guanciale uova pecorino;glutine,uova,latte</span>
              </div>
              <textarea className="onb-textarea" value={importText} onChange={(event) => setImportText(event.target.value)} rows={8} />
              <button className="onb-primary" disabled={working} onClick={importMenu}>{working ? "Aggiungo..." : "Aggiungi prodotti al menu"}</button>
              <small>{counts.menuItems || 0} prodotti nel menu.</small>
            </SetupActionCard>

            <SetupActionCard done={checks.qr} kicker="Passo 4" title="QR tavoli" text="Controlla l'anteprima e stampa i QR da mettere sui tavoli.">
              <div className="onb-actions">
                <button className="onb-secondary" onClick={openQrPreview}>Apri anteprima QR</button>
                <button className="onb-primary" disabled={!qrLinks.length} onClick={printQrPdf}>Stampa PDF QR</button>
              </div>
              <small>{qrLinks.length} QR pronti.</small>
            </SetupActionCard>
          </section>

          <section className="onb-staff-strip">
            <div>
              <span>Staff opzionale</span>
              <strong>Non serve creare subito piu email.</strong>
              <small>Parti con l'account owner. Aggiungi cucina, bar o cassa solo se il locale usa tablet separati.</small>
            </div>
            <button className="onb-secondary" type="button" onClick={() => { window.location.href = "/admin?tab=staff"; }}>Configura piu avanti</button>
          </section>

          {showQrPreview ? (
            <div className="onb-modal-backdrop" role="presentation" onClick={() => setShowQrPreview(false)}>
              <section className="onb-qr-modal" role="dialog" aria-modal="true" aria-label="Anteprima QR tavoli" onClick={(event) => event.stopPropagation()}>
                <div className="onb-modal-head">
                  <div>
                    <span>Anteprima stampa</span>
                    <h2>{restaurant?.name || "Ristorante"} - QR Tavoli</h2>
                    <p>Controlla i QR prima di stamparli e metterli sui tavoli.</p>
                  </div>
                  <div className="onb-modal-actions">
                    <button className="onb-secondary" type="button" onClick={() => setShowQrPreview(false)}>Chiudi</button>
                    <button className="onb-primary" type="button" disabled={!qrLinks.length} onClick={printQrPdf}>Stampa QR</button>
                  </div>
                </div>
                <div className="onb-print-area">
                  <div className="onb-print-title">
                    <h2>{restaurant?.name || "Ristorante"} - QR Tavoli</h2>
                    <p>Scansiona per ordinare dal tavolo.</p>
                  </div>
                  <div className="onb-qr-grid">
                    {qrLinks.map((table) => (
                      <div className="onb-qr-card" key={table.id}>
                        <h3>{table.name}</h3>
                        <QRCodeSVG className="onb-qr-code" value={table.link} size={180} includeMargin />
                        <p>{table.link}</p>
                      </div>
                    ))}
                    {!qrLinks.length ? <div className="onb-qr-empty">Crea prima i tavoli per generare i QR.</div> : null}
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
