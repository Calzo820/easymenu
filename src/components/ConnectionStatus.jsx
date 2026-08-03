import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [state, setState] = useState(initialState);
  const recoveredTimer = useRef(null);
  const isCustomerMenu = location.pathname === "/menu"
    || location.pathname.startsWith("/menu/")
    || location.pathname === "/cliente/menu"
    || location.pathname.startsWith("/cliente/menu/");
  const shouldMonitor = isCustomerMenu || Boolean(localStorage.getItem("auth_token"));

  useEffect(() => {
    if (!shouldMonitor) return undefined;
    const stopQueue = startOfflineOrderSync();
    const onOnline = () => setState((prev) => ({ ...prev, status: "recovering", message: "Connessione ripristinata, sincronizzo..." }));
    const onOffline = () => setState((prev) => ({ ...prev, status: "offline", message: "Connessione assente: gli ordini restano protetti" }));
    const onApiStatus = (event) => setState((prev) => ({ ...prev, ...(event.detail || {}) }));
    const onQueue = (event) => setState((prev) => ({ ...prev, pending: Number(event.detail?.pending || 0) }));
    const stopSocket = subscribeSocketStatus((detail) => setState((prev) => ({ ...prev, ...detail })));

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("ordynora:connection-status", onApiStatus);
    window.addEventListener("ordynora:offline-queue", onQueue);
    return () => {
      stopQueue();
      stopSocket();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("ordynora:connection-status", onApiStatus);
      window.removeEventListener("ordynora:offline-queue", onQueue);
      if (recoveredTimer.current) window.clearTimeout(recoveredTimer.current);
    };
  }, [shouldMonitor]);

  useEffect(() => {
    if (!shouldMonitor || state.status !== "connected" || state.pending > 0) return undefined;
    recoveredTimer.current = window.setTimeout(() => {
      setState((prev) => ({ ...prev, message: "" }));
    }, 2800);
    return () => window.clearTimeout(recoveredTimer.current);
  }, [shouldMonitor, state.status, state.pending]);

  if (!shouldMonitor || (!state.message && state.pending === 0)) return null;

  return (
    <div className={`em-connection em-connection--${state.status}`} role="status" aria-live="polite">
      <i aria-hidden="true" />
      <span>{state.message || "Sincronizzazione in corso"}</span>
      {state.pending > 0 ? <b>{state.pending} {state.pending === 1 ? "ordine in coda" : "ordini in coda"}</b> : null}
    </div>
  );
}
