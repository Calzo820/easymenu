# EasyMenu — pacchetto beta vendibile

Questa versione è pensata per vendere una **beta controllata** a ristoranti pilota.

## Cosa è già incluso

- QR ordering cliente con carrello mobile.
- Ordini in tempo reale verso cucina, bar e cassa.
- Dashboard, storico, statistiche, tavoli e QR.
- Stripe Checkout per pagamento online.
- Webhook Stripe: checkout completato -> pagamento registrato -> ordine pagato quando il totale è coperto.
- Split conto stabile tramite quote Stripe.
- Ricevuta/preconto HTML stampabile da link pubblico ordine.
- Protezione anti doppio ordine tramite `clientRequestId` idempotente.
- Config Render/Vercel e `.env` di produzione.
- Script demo e smoke test finale.

## Prima vendita consigliata

Vendilo come **beta assistita**, non come prodotto self-service totalmente autonomo.

Prezzo consigliato:

- Beta: 19–29 €/mese.
- Setup assistito: 49–99 € una tantum.
- Dopo 2/3 ristoranti stabili: 49–79 €/mese.

## Checklist finale obbligatoria prima del primo ristorante

1. Deploy backend su Render/Railway/Fly.
2. Deploy frontend su Vercel/Netlify.
3. Neon collegato con `DATABASE_URL` in produzione.
4. `npx prisma migrate deploy` eseguito.
5. Stripe in modalità live con webhook configurato.
6. `CORS_ORIGIN` impostato con dominio frontend reale.
7. Smoke test: `cd backend && npm run test:final`.
8. Test reale con 2 smartphone: ordine, cucina, bar, cassa, pagamento.
9. Stampa QR dei tavoli.
10. Ristoratore formato su dashboard, menu e cassa.

## Limite onesto

Il codice è pronto per una beta vendibile. Per vendere “in automatico” a tanti ristoranti servono ancora onboarding self-service, contratti/privacy completi e assistenza operativa.
