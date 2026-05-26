# Patch produzione ristorante — 14/05/2026

Questa patch aggiunge solo file e modifiche mirate, senza rimuovere funzioni esistenti.

## Cosa include

- UX operativa cucina/bar più vendibile: ticket stampabili direttamente da Cucina e Bar con formato 80mm.
- Resilienza ordini QR: coda offline su `localStorage`, retry automatico al ritorno della rete e polling di sicurezza.
- Analytics owner più utili: tavoli più profittevoli, migliori fasce orarie e tempi medi cucina/servizio.
- Menu management più serio: ingredienti, varianti JSON, extra/modificatori JSON, combo JSON, disponibilità temporanea.
- Migrazione database per i nuovi campi menu.

## File modificati o aggiunti

- `src/lib/offlineOrders.js`
- `src/lib/printTickets.js`
- `src/pages/Cliente.jsx`
- `src/pages/Cucina.jsx`
- `src/pages/Bar.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/AdminPanel.jsx`
- `backend/controllers/analytics.controller.js`
- `backend/controllers/menu.controller.js`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260514120000_menu_pro_fields/migration.sql`

## Deploy

1. Copiare i file sopra nel progetto.
2. Dal backend eseguire `npm run prisma:deploy` o `npx prisma migrate deploy --schema=./prisma/schema.prisma`.
3. Rigenerare Prisma se necessario: `npm run prisma:generate`.
4. Build frontend: `npm run build`.

Nota: nel pacchetto ricevuto i `node_modules` sembrano generati su Windows e nel sandbox manca il binding Linux di Rolldown/Vite. La build va lanciata dopo un `npm install` pulito nell'ambiente di deploy.
