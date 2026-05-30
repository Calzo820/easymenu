# Security policy EasyMenu

## Segreti e variabili ambiente
Non committare né condividere file `.env` reali. Usa solo `.env.example` con valori fittizi.

Prima di inviare il progetto a terzi:

```bash
rm -rf node_modules dist .env .env.* backend/.env backend/.env.*
```

Poi ripristina solo gli example se servono:

```bash
git checkout -- .env.example .env.production.example backend/.env.example backend/.env.postgres.example
```

## Chiavi da ruotare se sono state condivise
- JWT_SECRET
- DATABASE_URL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- credenziali SMTP o provider email
- token Sentry o servizi esterni

## Build pulita
Installa dipendenze solo dopo aver scaricato il repository:

```bash
npm install
cd backend && npm install
```

Genera la build localmente o in CI/CD:

```bash
npm run build
```
