import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const APP_PATHS = ["/staff", "/login", "/dashboard", "/cucina", "/bar", "/cassa", "/tavoli"];

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function AppInstallPrompt() {
  const location = useLocation();
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("easymenu_install_dismissed") === "1");

  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const relevantPath = APP_PATHS.some((path) => location.pathname.startsWith(path));
  const showIosHelp = isIos() && !installed;
  if (!relevantPath || installed || dismissed || (!installEvent && !showIosHelp)) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  function dismiss() {
    sessionStorage.setItem("easymenu_install_dismissed", "1");
    setDismissed(true);
  }

  return (
    <aside className="em-install-prompt" aria-label="Installa EasyMenu">
      <div>
        <b>EasyMenu sul telefono</b>
        <span>{installEvent ? "Aprilo come un'app, senza cercarlo ogni volta." : "Tocca Condividi e poi Aggiungi alla schermata Home."}</span>
      </div>
      {installEvent ? <button type="button" onClick={install}>Installa</button> : null}
      <button type="button" className="em-install-dismiss" onClick={dismiss} aria-label="Chiudi">×</button>
    </aside>
  );
}
