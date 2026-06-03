# Procedura supporto

## Classificazione ticket
- P1: sistema non raggiungibile, ordini bloccati, pagamenti critici.
- P2: cucina/cassa degradate, funzioni principali intermittenti.
- P3: problemi singoli, correzioni contenuti, richieste operative.

## Raccolta dati
Chiedere sempre: ristorante, tavolo, ora evento, ruolo utente, screenshot, eventuale ID ordine.

## Diagnosi rapida
1. Controllare `/health` e `/ready`.
2. Verificare log backend.
3. Controllare stato DB e migrazioni.
4. Per pagamenti, verificare dashboard Stripe e webhook.

## Chiusura ticket
Documentare causa, azione fatta, prevenzione e conferma cliente.
