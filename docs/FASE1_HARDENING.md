# FASE 1 — Hardening

Patch applicata senza rimuovere codice esistente.

## Incluso
- Retry API con backoff, timeout e messaggi per connessione lenta.
- Socket realtime con reconnect infinito, recovery, gestione connect_error/reconnect_failed.
- Hook `useSocket` sicuro: cleanup listener, stato connessione e crash handler lato client.
- Stati UI riutilizzabili `LoadingState` e `ErrorState`.
- Validazione backend forte per ordine pubblico, cambio stato ed extra cassa.
- Log backend per errori socket, middleware, crash process, rejection non gestite.
- Aggiornamento stato ordine concorrente protetto con risposta 409 quando due dispositivi modificano lo stesso ordine.

## Test manuali consigliati
1. Aprire dashboard/cucina/cassa su due dispositivi e creare un ordine QR.
2. Simulare rete lenta in DevTools: verificare retry e messaggio connessione lenta.
3. Cambiare stato dello stesso ordine da due browser: uno deve ricevere conflitto 409/refresh.
4. Spegnere e riaccendere backend: socket deve riconnettersi senza ricaricare pagina.
5. Inviare payload ordine incompleto: backend deve rispondere 400, non 500.
