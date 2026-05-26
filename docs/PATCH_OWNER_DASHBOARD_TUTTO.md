# Patch EasyMenu - realtime + dashboard owner potente

Questa patch è additiva: non rimuove le funzioni esistenti.

## File da sostituire

- `backend/controllers/analytics.controller.js`
- `src/pages/Dashboard.jsx`

## Cosa aggiunge

- Dashboard owner con KPI principali: fatturato oggi, ordini completati, ticket medio, tavoli attivi, alert pagamenti, errori aperti.
- Prodotti più venduti oggi con barre visuali.
- Ordini per ora della giornata.
- Tavoli e ordini attivi in tempo reale.
- Alert owner per prodotti esauriti, pagamenti sospesi e log errori aperti.
- Aggiornamento live tramite Socket.IO sugli eventi: nuovo ordine, ordine aggiornato, tavolo aggiornato, pagamento aggiornato.
- Fallback automatico ogni 30 secondi se il realtime non arriva.

## Dopo aver copiato i file

Nel backend:

```bash
npm install
npx prisma generate --schema=./prisma/schema.prisma
npm run dev
```

Nel frontend:

```bash
npm install
npm run dev
```

## Rotta usata dalla dashboard

```txt
GET /analytics/summary
```

La rotta è già protetta e visibile a `owner`, `admin`, `cashier`.
