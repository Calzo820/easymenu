const clients = new Map();

export function registerClient(id, socket) {
  clients.set(id, {
    socket,
    lastSeen: Date.now(),
  });
}

export function heartbeatClient(id) {
  const client = clients.get(id);
  if (!client) return;

  client.lastSeen = Date.now();
}

export function cleanupDeadClients() {
  const now = Date.now();

  for (const [id, client] of clients.entries()) {
    if (now - client.lastSeen > 30000) {
      try {
        client.socket.disconnect();
      } catch {}

      clients.delete(id);
    }
  }
}

setInterval(cleanupDeadClients, 15000);
