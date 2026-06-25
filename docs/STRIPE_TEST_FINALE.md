# Stripe - test finale prima della vendita

Usare questa checklist con chiavi Stripe test e poi ripeterla con chiavi live.

## Variabili Render obbligatorie
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER` per mensile
- `STRIPE_PRICE_GROWTH` per trimestrale
- `STRIPE_PRICE_SEMIANNUAL` per semestrale
- `STRIPE_PRICE_ENTERPRISE` per annuale
- `CLIENT_URL`
- `CORS_ORIGIN`

Webhook Stripe: `https://TUO-BACKEND/payments/webhook`

## Test checkout SaaS
- Mensile: apri `/billing`, scegli Mensile, verifica checkout corretto.
- Trimestrale: scegli Trimestrale, verifica checkout corretto.
- Semestrale: scegli Semestrale, verifica checkout corretto.
- Annuale: scegli Annuale, verifica checkout corretto.
- IVA: verifica se Stripe mostra IVA corretta. Se usi Stripe Tax, abilita `STRIPE_AUTOMATIC_TAX=true`.

## Test eventi
- Pagamento completato: il webhook deve aggiornare subscription e ristorante attivo.
- Pagamento fallito: `invoice.payment_failed` deve creare log pagamento e stato non sano.
- Disdetta: `customer.subscription.deleted` deve aggiornare stato e non lasciare il ristorante attivo per sempre.
- Portale abbonamento: il pulsante "Gestisci abbonamento" deve aprire il portale Stripe.

## Test manuale consigliato
1. Crea ristorante test dal SuperAdmin.
2. Apri Billing come owner.
3. Esegui checkout con carta test `4242 4242 4242 4242`.
4. Controlla `/subscriptions/status`.
5. Controlla pagina `/errori` dopo un evento fallito.
6. Disdici dal portale Stripe e verifica stato dopo webhook.
