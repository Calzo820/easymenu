import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { createRestaurantSocket } from "../lib/realtime";
import { sendTicketToBridge } from "../lib/printTickets";

function settingsKey(area) {
  return `easymenu_printer_${area}_v1`;
}

function readSettings(area) {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey(area)) || "null");
    return {
      autoPrint: Boolean(saved?.autoPrint),
      bridgeUrl: String(saved?.bridgeUrl || import.meta.env.VITE_PRINT_BRIDGE_URL || "").trim(),
    };
  } catch {
    return { autoPrint: false, bridgeUrl: String(import.meta.env.VITE_PRINT_BRIDGE_URL || "").trim() };
  }
}

function saveSettings(area, settings) {
  localStorage.setItem(settingsKey(area), JSON.stringify(settings));
}

export default function useStationPrinter(area) {
  const initial = readSettings(area);
  const [autoPrint, setAutoPrintState] = useState(initial.autoPrint);
  const [bridgeUrl] = useState(initial.bridgeUrl);
  const [pendingJobs, setPendingJobs] = useState(0);
  const [status, setStatus] = useState({ tone: "idle", message: "Coda pronta" });
  const processing = useRef(false);
  const autoPrintRef = useRef(initial.autoPrint);

  const setAutoPrint = useCallback((value) => {
    const next = Boolean(value);
    autoPrintRef.current = next;
    setAutoPrintState(next);
    saveSettings(area, { autoPrint: next, bridgeUrl });
  }, [area, bridgeUrl]);

  const runJob = useCallback(async (candidate) => {
    const claimedData = await apiPost(`/print-jobs/${candidate.id}/claim`, {});
    if (claimedData?.alreadyPrinted) return;
    const job = claimedData?.job;
    if (!job?.order) throw new Error("Comanda di stampa incompleta");

    try {
      setStatus({ tone: "printing", message: `Stampa ${job.order.table?.name || "tavolo"}...` });
      await sendTicketToBridge(job.order, area, bridgeUrl);
      await apiPost(`/print-jobs/${job.id}/complete`, {});
      setStatus({ tone: "ready", message: bridgeUrl ? "Comanda inviata alla stampante" : "Finestra di stampa aperta" });
    } catch (error) {
      await apiPost(`/print-jobs/${job.id}/fail`, { message: error.message }).catch(() => {});
      setStatus({ tone: "error", message: error.message || "Stampa non riuscita" });
      throw error;
    }
  }, [area, bridgeUrl]);

  const processQueue = useCallback(async ({ force = false } = {}) => {
    if (processing.current) return;
    processing.current = true;
    try {
      const data = await apiGet(`/print-jobs?area=${encodeURIComponent(area)}&limit=12`);
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
      setPendingJobs(jobs.length);
      if ((!autoPrintRef.current && !force) || jobs.length === 0) return;
      for (const job of jobs) {
        await runJob(job);
      }
      setPendingJobs(0);
    } catch (error) {
      if (!/presa in carico/i.test(error.message || "")) {
        setStatus({ tone: "error", message: error.message || "Coda stampa non disponibile" });
      }
    } finally {
      processing.current = false;
    }
  }, [area, runJob]);

  const printOrder = useCallback(async (order) => {
    if (!order?.id) return;
    try {
      setStatus({ tone: "printing", message: "Preparo la ristampa..." });
      const data = await apiPost(`/print-jobs/order/${order.id}`, { area });
      if (!data?.job) throw new Error("Comanda non disponibile");
      await runJob(data.job);
      await processQueue();
    } catch (error) {
      setStatus({ tone: "error", message: error.message || "Ristampa non disponibile" });
    }
  }, [area, processQueue, runJob]);

  useEffect(() => {
    processQueue();
    const socket = createRestaurantSocket();
    const onPrintEvent = (payload) => {
      if (payload?.area && payload.area !== area) return;
      if (payload?.kind === "reprint") return;
      processQueue();
    };
    socket.on("print-job", onPrintEvent);
    socket.on("print-job-updated", onPrintEvent);
    socket.on("connect", () => processQueue());
    const timer = window.setInterval(() => processQueue(), 15000);
    return () => {
      socket.disconnect();
      window.clearInterval(timer);
    };
  }, [area, processQueue]);

  useEffect(() => {
    if (autoPrint) processQueue();
  }, [autoPrint, processQueue]);

  return {
    autoPrint,
    setAutoPrint,
    pendingJobs,
    status,
    printMode: bridgeUrl ? "bridge" : "browser",
    printOrder,
    refreshQueue: processQueue,
  };
}
