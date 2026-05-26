# Checklist finale EasyMenu SaaS

## 1. Test finale completo
- Avvia backend: `cd backend && npm run dev`.
- Avvia frontend: `npm run dev`.
- Crea seed demo: `cd backend && npm run demo:seed`.
- Esegui test end-to-end: `cd backend && npm run test:final`.
- Flusso coperto: login owner, menu demo, ordine cliente, arrivo cucina/bar/cassa, cambio stato, checkout Stripe test se configurato.

## 2. Pagamenti veri Stripe
Variabili backend obbligatorie:
```env
STRIPE_SECRET_KEY=sk_live_o_sk_test
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=https://tuo-frontend.it
CORS_ORIGIN=https://tuo-frontend.it
```
Webhook Stripe da configurare su `/payments/webhook` con eventi:
- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
- `charge.refunded`

Il webhook aggiorna le transazioni e porta l'ordine a `paymentStatus=paid` quando il totale è coperto. Lo split conto crea una transazione separata per quota e mantiene il residuo stabile.

## 3. UX cliente pro
- Carrello persistente su localStorage.
- Conferma ordine con stato live, pagamento, split conto e preconto/ricevuta.
- Bottoni mobile più grandi e messaggi errore/successo puliti.

## 4. Deploy online
Backend consigliato: Render/Railway/Fly.io.
Frontend consigliato: Vercel/Netlify.
Database: Neon già ok con `DATABASE_URL`.
Comandi backend hosting:
```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm start
```
Comandi frontend hosting:
```bash
npm install
npm run build
```
Variabili frontend:
```env
VITE_API_URL=https://tuo-backend.it
VITE_BETA_PRICE=49€/mese
```

## 5. Demo commerciale
Pagina demo commerciale rimossa: usa la dashboard e il flusso reale del prodotto per le presentazioni.
Include QR demo, CTA, script vendita e prezzo beta configurabile.
