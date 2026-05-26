# Deploy passo-passo

## Backend

1. Crea servizio Node su Render.
2. Root directory: `backend`.
3. Build command: `npm ci && npx prisma generate && npx prisma migrate deploy`.
4. Start command: `npm run start`.
5. Health check: `/ready`.
6. Aggiungi variabili da `backend/.env.example`.

## Frontend

1. Crea progetto Vercel collegato alla root.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Aggiungi `VITE_API_URL=https://URL-BACKEND`.
5. Dopo il deploy frontend, aggiorna nel backend:
   - `CLIENT_URL`
   - `FRONTEND_URL`
   - `CORS_ORIGIN`

## Stripe

1. Crea prodotti/prezzi SaaS per piani Starter/Growth/Enterprise.
2. Copia i price id in `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_ENTERPRISE`.
3. Webhook endpoint: `https://URL-BACKEND/payments/webhook`.
4. Eventi minimi:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copia `whsec_...` in `STRIPE_WEBHOOK_SECRET`.

## Test produzione

```bash
cd backend
npm run test:final
```

Poi prova manualmente: login owner, QR cliente, ordine, cucina/bar/cassa, stato ordine, pagamento Stripe test/live.
