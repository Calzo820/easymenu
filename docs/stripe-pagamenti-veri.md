# Stripe pagamenti veri

1. Crea account Stripe e completa onboarding.
2. Inserisci `STRIPE_SECRET_KEY` nel backend.
3. Crea webhook verso `https://BACKEND_URL/payments/webhook`.
4. Copia `STRIPE_WEBHOOK_SECRET`.
5. Crea 4 price ricorrenti: mensile, trimestrale, semestrale, annuale.
6. Configura su Render `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SEMIANNUAL`, `STRIPE_PRICE_ENTERPRISE`.
7. Se vuoi IVA automatica Stripe Tax, abilita Stripe Tax e imposta `STRIPE_AUTOMATIC_TAX=true`.
8. Testa con carta `4242 4242 4242 4242` in test mode.
9. Passa a chiavi live solo dopo test completo.

Endpoint utili:
- `POST /payments/public/:token/checkout`: crea checkout ordine o quota split.
- `GET /payments/public/:token/summary`: totale, pagato e residuo.
- `GET /payments/public/:token/receipt`: ricevuta/preconto base.
- `POST /subscriptions/checkout`: checkout abbonamento SaaS.
- `POST /subscriptions/portal`: portale "Gestisci abbonamento".
- `GET /subscriptions/status`: stato piano, rinnovo, price configurate.

Webhook abbonamenti:
- `checkout.session.completed`: sincronizza piano e attiva il ristorante se subscription e valida.
- `invoice.payment_failed`: registra problema pagamento e lascia visibile l'avviso.
- `customer.subscription.deleted`: sincronizza cancellazione e impedisce che il ristorante resti attivo per sempre.
