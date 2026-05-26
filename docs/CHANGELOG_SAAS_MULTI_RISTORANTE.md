# Changelog SaaS multi-ristorante

## Aggiunto
- Socket.io isolato per ristorante tramite room `restaurant:{restaurantId}`.
- Autenticazione socket via JWT, senza rimuovere il polling di backup.
- Pagina owner **Log errori** con API protetta `/logs/errors`.
- Modello Prisma `ErrorLog` per errori backend, webhook e pagamenti falliti.
- Migrazione Prisma per `clientRequestId` idempotente e `ErrorLog`.
- Utility frontend `src/lib/realtime.js` per connessioni realtime coerenti.
- Manuale ristoratore operativo in `docs/MANUALE_RISTORATORE_EASYMENU.md`.

## Rafforzato
- Eventi ordine/pagamento inviati solo al ristorante corretto.
- Pagamenti Stripe scaduti/falliti tracciati in log.
- Cucina, bar e cassa ricevono update live e mantengono polling come fallback.
- Dashboard e navbar linkano il controllo log per owner/admin.

## Conservato
- Flussi esistenti menu, cliente, cucina, bar, cassa, tavoli, QR, storico, statistiche e billing.
- Logica di snapshot prodotto negli ordini.
- Demo commerciale e manuale demo già presenti.
