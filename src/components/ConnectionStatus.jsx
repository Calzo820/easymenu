import { useEffect, useRef, useState } from "react";
import { pendingPublicOrdersCount, startOfflineOrderSync } from "../lib/offlineOrders";
import { subscribeSocketStatus } from "../lib/realtime";

function initialState() {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  return {
    status: online ? "connected" : "offline",
    message: online ? "Sistema online" : "Connessione assente",
    pending: pendingPublicOrdersCount(),
  };
}

export default function ConnectionStatus() {
  const [state, setState] = useState(initialState);
  const recoveredTimer = useRef(null);

  useEffect(() => {
    const stopQueue = startOfflineOrderSync();
    const onOnline = () => setState((prev) => ({ ...prev, status: "recovering", message: "Connessione ripristinata, sincronizzo..." }));
    const onOffline = () => setState((prev) => ({ ...prev, status: "offline", message: "Connessione assente: gli ordini restano protetti" }));
    const onApiStatus = (event) => setState((prev) => ({ ...prev, ...(event.detail || {}) }));
    const onQueue = (event) => setState((prev) => ({ ...prev, pending: Number(event.detail?.pending || 0) }));
    const stopSocket = subscribeSocketStatus((detail) => setState((prev) => ({ ...prev, ...detail })));

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("easymenu:connection-status", onApiStatus);
    window.addEventListener("easymenu:offline-queue", onQueue);
    return () => {
      stopQueue();
      stopSocket();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("easymenu:connection-status", onApiStatus);
      window.removeEventListener("easymenu:offline-queue", onQueue);
      if (recoveredTimer.current) window.clearTimeout(recoveredTimer.current);
    };
  }, []);

  useEffect(() => {
    if (state.status !== "connected" || state.pending > 0) return undefined;
    recoveredTimer.current = window.setTimeout(() => {
      setState((prev) => ({ ...prev, message: "" }));
    }, 2800);
    return () => window.clearTimeout(recoveredTimer.current);
  }, [state.status, state.pending]);

  if (!state.message && state.pending === 0) return null;

  return (
    <div className={`em-connection em-connection--${state.status}`} role="status" aria-live="polite">
      <i aria-hidden="true" />
      <span>{state.message || "Sincronizzazione in corso"}</span>
      {state.pending > 0 ? <b>{state.pending} {state.pending === 1 ? "ordine in coda" : "ordini in coda"}</b> : null}
    </div>
  );
}
