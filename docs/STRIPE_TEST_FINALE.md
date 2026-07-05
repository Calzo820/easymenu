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
- Mensile: `49,99 EUR/mese + IVA`, price id `STRIPE_PRICE_STARTER`, checkout corretto.
- Trimestrale: `134,99 EUR/3 mesi + IVA`, price id `STRIPE_PRICE_GROWTH`, checkout corretto.
- Semestrale: `254,99 EUR/6 mesi + IVA`, price id `STRIPE_PRICE_SEMIANNUAL`, checkout corretto.
- Annuale: `449,99 EUR/anno + IVA`, price id `STRIPE_PRICE_ENTERPRISE`, checkout corretto.
- IVA: verifica se Stripe mostra IVA corretta. Se usi Stripe Tax, abilita `STRIPE_AUTOMATIC_TAX=true` e controlla aliquota 22% dove applicabile.

## Test eventi
- Pagamento completato: il webhook deve aggiornare subscription e ristorante attivo.
- Pagamento fallito: `invoice.payment_failed` deve creare log pagamento, stato non sano e alert visibile in Billing/Dashboard.
- Disdetta: `customer.subscription.deleted` deve aggiornare stato e non lasciare il ristorante attivo per sempre.
- Portale abbonamento: il pulsante "Gestisci abbonamento" deve aprire il portale Stripe.

## Matrice minima da firmare prima dei ristoranti
| Caso | Risultato atteso |
| --- | --- |
| Checkout mensile | Si apre Stripe con prezzo mensile corretto |
| Checkout trimestrale | Si apre Stripe con prezzo trimestrale corretto |
| Checkout semestrale | Si apre Stripe con prezzo semestrale corretto |
| Checkout annuale | Si apre Stripe con prezzo annuale corretto |
| Pagamento riuscito | `/subscriptions/status` mostra `active` o `trialing`, ristorante usabile |
| Pagamento fallito | Billing mostra warning e log tecnico visibile |
| Disdetta | Stato aggiornato, accesso bloccato alla scadenza se non rinnova |
| Portale Stripe | Metodo pagamento, fatture e cancellazione disponibili |

## Test manuale consigliato
1. Crea ristorante test dal SuperAdmin.
2. Apri Billing come owner.
3. Esegui checkout con carta test `4242 4242 4242 4242`.
4. Controlla `/subscriptions/status`.
5. Controlla pagina `/errori` dopo un evento fallito.
6. Disdici dal portale Stripe e verifica stato dopo webhook.
