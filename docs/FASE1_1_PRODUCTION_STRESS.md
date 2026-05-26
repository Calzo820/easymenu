# FASE 1.1 — Production Stress / Ristorante pieno

Questa patch completa la FASE 1 per scenari reali: sala piena, più dispositivi, connessione instabile, cucina/cassa/sala aperte insieme.

## Incluso

- API retry con jitter e supporto Idempotency-Key anche su POST critici.
- `saveAuthSession` stabile per login/register.
- Realtime socket con reconnect infinito, heartbeat, deduplica eventi e payload con `eventId`.
- Offline queue frontend per ordini QR in caso di rete assente o ballerina.
- Anti double-submit frontend per evitare doppi ordini da tap multipli.
- Rate limit backend riutilizzabile e con header `Retry-After`.
- Request ID backend per correlare log, errori e richieste.
- Validazione JSON malformato.
- Health endpoint `/health` e readiness `/ready` già compatibili con Render/VPS.
- Protezione concorrenza update stato ordine con `ifUnmodifiedSince`.
- Script stress backend `npm run hardening:stress`.

## Comandi consigliati

```powershell
npm install
npm run build
cd backend
npm install
npm run check:env
npm run hardening:stress
```

Per lo stress test devi prima impostare un payload reale:

```powershell
$env:ORDER_PAYLOAD_JSON='{ "restaurantSlug":"demo", "tableToken":"TOKEN_TAVOLO", "items":[{"menuItemId":"ID_PIATTO","quantity":1}] }'
npm run hardening:stress
```

## Note produzione

Per un SaaS multi-ristorante ad alto traffico, il passo successivo consigliato è spostare rate limit e queue su Redis quando avrai più istanze backend orizzontali. Questa patch è sicura per singola istanza Node/Render/VPS e migliora molto l'affidabilità reale senza eliminare codice esistente.
