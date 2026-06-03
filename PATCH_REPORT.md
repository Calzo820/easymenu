# Report nuova patch priorità

## Rimossi dal pacchetto
- `.env`
- `node_modules/`
- `backend/node_modules/`
- `dist/`

## Aggiunti/modificati principali
- Docker produzione multi-stage Node 20.
- `docker-compose.prod.yml` con PostgreSQL e healthcheck.
- `.dockerignore` e `.gitignore` rafforzati.
- Sessioni refresh token in cookie httpOnly con modello Prisma `UserSession`.
- Rotte `/auth/refresh` e `/auth/logout`.
- Frontend con `credentials: include` e retry refresh su 401.
- Test minimi Node test + Supertest su health, login validation, ordine, stato ordine, webhook Stripe.
- Documenti privacy, termini, backup DB, supporto e deploy produzione.
- Hook/componente per avviare refactoring ordinato delle pagine grandi.

## Nota
Il refactoring completo delle pagine grandi richiede test visivi/funzionali dedicati; qui sono stati aggiunti mattoni riusabili senza cambiare pesantemente la UX esistente.
