import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'easymenu_offline_orders';

export function useOfflineOrders(sendOrder) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const syncing = useRef(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setPendingOrders(saved);

    async function syncQueue() {
      if (!navigator.onLine || syncing.current) return;
      syncing.current = true;

      const queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
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
