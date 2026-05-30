# Sicurezza EasyMenu

## File da non committare mai
- `.env`
- `.env.local`
- `.env.production`
- chiavi Stripe, JWT secret, database URL, token API provider
- dump database
- log con dati cliente

## Variabili d'ambiente
Usare solo `.env.example` come template. Le variabili reali vanno configurate in Render, GitHub Secrets o nel provider di hosting.

## Rotazione credenziali
Se un file `.env` reale è stato condiviso o caricato per errore:
1. ruotare `JWT_SECRET`;
2. rigenerare chiavi Stripe;
3. cambiare password/URL database;
4. invalidare token provider esterni;
5. rimuovere il segreto dalla history Git se già committato.

## API e webhook
- validare sempre firme webhook Stripe/provider;
- limitare CORS agli origin reali;
- non esporre stack trace in produzione;
- usare rate limit su login, register, ordini pubblici e pagamenti.

## Repository
Lo ZIP di consegna deve escludere `node_modules`, `dist` e `.env` reali.
