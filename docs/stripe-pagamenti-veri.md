# Stripe pagamenti veri

1. Crea account Stripe e completa onboarding.
2. Inserisci `STRIPE_SECRET_KEY` nel backend.
3. Crea webhook verso `https://BACKEND_URL/payments/webhook`.
4. Copia `STRIPE_WEBHOOK_SECRET`.
5. Testa con carta `4242 4242 4242 4242` in test mode.
6. Passa a chiavi live solo dopo test completo.

Endpoint utili:
- `POST /payments/public/:token/checkout`: crea checkout ordine o quota split.
- `GET /payments/public/:token/summary`: totale, pagato e residuo.
- `GET /payments/public/:token/receipt`: ricevuta/preconto base.
