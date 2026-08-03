import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'ordynora_offline_orders';
const LEGACY_STORAGE_KEY = 'easymenu_offline_orders';

function readSavedOrders() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = current === null ? localStorage.getItem(LEGACY_STORAGE_KEY) : null;
    if (current === null && legacy !== null) localStorage.setItem(STORAGE_KEY, legacy);
    return JSON.parse(current || legacy || '[]');
  } catch {
    return [];
  }
}

export function useOfflineOrders(sendOrder) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const syncing = useRef(false);

  useEffect(() => {
    const saved = readSavedOrders();
    setPendingOrders(saved);

    async function syncQueue() {
      if (!navigator.onLine || syncing.current) return;
      syncing.current = true;

      const queue = readSavedOrders();
      const remaining = [];

      for (const order of queue) {
        try {
          await sendOrder(order);
        } catch {
          remaining.push(order);
        }
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      setPendingOrders(remaining);
      syncing.current = false;
    }

    window.addEventListener('online', syncQueue);
    const interval = setInterval(syncQueue, 5000);

    return () => {
      window.removeEventListener('online', syncQueue);
      clearInterval(interval);
    };
  }, [sendOrder]);

  function enqueueOrder(order) {
    const updated = [...pendingOrders, {
      ...order,
      queuedAt: Date.now(),
      retryCount: 0,
    }];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setPendingOrders(updated);
  }

  return {
    pendingOrders,
    enqueueOrder,
  };
}
