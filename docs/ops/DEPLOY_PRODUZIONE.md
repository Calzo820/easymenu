# Deploy produzione

## Requisiti
- Node.js 20+
- PostgreSQL 16+
- Variabili ambiente da `backend/.env.production.example`
- Dominio HTTPS per frontend/API

## Docker Compose
```bash
cp backend/.env.production.example .env.production
# compila i valori reali, poi:
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Verifiche
```bash
curl https://tuo-dominio/health
curl https://tuo-dominio/ready
```

## Note sicurezza
- Non committare `.env`.
- Ruotare `JWT_SECRET` se è stato esposto.
- Configurare `CORS_ORIGIN` solo sui domini reali.
- Configurare webhook Stripe solo su HTTPS.
