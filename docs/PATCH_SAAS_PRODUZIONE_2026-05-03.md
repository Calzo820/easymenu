# Patch SaaS produzione — 2026-05-03

## Incluso in questa versione

- Autenticazione più solida con bcrypt, JWT access token breve e refresh token ruotabili/revocabili.
- Nuovo modello `RefreshToken` con migrazione PostgreSQL dedicata.
- Logout e refresh sessione: `POST /auth/logout`, `POST /auth/refresh`.
- Frontend aggiornato per salvare `accessToken` + `refreshToken` e ritentare automaticamente dopo 401.
- Middleware abbonamento `requireActiveSubscription` per bloccare funzioni operative quando il billing non è attivo.
- Stripe SaaS esteso con gestione webhook `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` e checkout subscription.
- Fix enum pagamenti: rimossi riferimenti a stato `failed` non presente nello schema Prisma.
- Dashboard Owner completa su `/owner`: fatturato oggi/periodo, ordini live, tavoli, grafico entrate, piatti più venduti e alert.
- Navbar aggiornata con link Owner e logout che pulisce anche refresh token.

## Variabili da configurare

- `JWT_SECRET`: stringa casuale forte, almeno 32 caratteri.
- `JWT_EXPIRES_IN`: consigliato `15m`.
- `REFRESH_TOKEN_DAYS`: consigliato `30`.
- `STRIPE_SECRET_KEY`.
- `STRIPE_WEBHOOK_SECRET`.
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_ENTERPRISE`.
- `STRIPE_TRIAL_DAYS`.

## Webhook Stripe consigliati

Configura in Stripe questi eventi:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.payment_failed`
- `charge.refunded`

## Prima del deploy

Esegui:

```bash
cd backend
npm install
npx prisma migrate deploy --schema=./prisma/schema.prisma
npx prisma generate --schema=./prisma/schema.prisma
npm run start:prod
```

Poi nel frontend:

```bash
npm install
npm run build
```

Nota: in questa patch la build frontend è stata verificata. La generazione Prisma nel container non è stata completata perché il binario Prisma Linux richiede download esterno da `binaries.prisma.sh`; in ambiente deploy con internet disponibile o cache corretta funzionerà con `npm install` + `prisma generate`.
