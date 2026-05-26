# EasyMenu — SaaS QR Ordering per Ristoranti

EasyMenu è una piattaforma SaaS per ristoranti che permette ai clienti di ordinare dal tavolo tramite QR code, mentre staff, cucina, bar e cassa gestiscono gli ordini in tempo reale.

## Funzioni principali

- Menu digitale per ristorante e tavolo tramite QR code.
- Ordini pubblici da tavolo con sessione tavolo.
- Dashboard staff con ruoli: owner, admin, cucina, bar e cassa.
- Aggiornamenti realtime tramite Socket.IO per utenti autenticati.
- Pagamenti e ricevuta/preconto.
- Multi-ristorante con isolamento dei dati per `restaurantId`.

## Requisiti

- Node.js 20+
- PostgreSQL compatibile Prisma, ad esempio Neon
- npm

## Setup locale

```bash
npm install
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

In un altro terminale, per il frontend:

```bash
npm run dev
```

## Variabili ambiente

Non committare mai `.env` reali. Usa solo `.env.example` come riferimento.

Variabili backend essenziali:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
JWT_SECRET="genera-una-stringa-casuale-lunga-almeno-32-caratteri"
CLIENT_URL="http://localhost:5173"
CORS_ORIGIN="http://localhost:5173,http://localhost:4173"
```

Per generare un JWT secret sicuro:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Sicurezza applicata

- I socket per eventi ristorante richiedono JWT valido.
- `clientRequestId` non è più globale: viene trasformato in una chiave idempotente scoped per ristorante/tavolo/sessione.
- La numerazione ordini usa un contatore atomico per ristorante.
- Gli importi sono gestiti come `Decimal` nel database.
- La ricevuta HTML fa escaping dei dati dinamici.

## Deploy

1. Configura le variabili ambiente reali sulla piattaforma di deploy.
2. Esegui le migration Prisma.
3. Installa le dipendenze da `package-lock.json` con `npm ci`.
4. Non caricare `node_modules`, `.env`, build locali o file temporanei.

## Cosa non includere nel repository

- `.env` e segreti reali.
- `node_modules`.
- `dist`.
- dump database o file `.db`.
- chiavi Stripe, Neon, JWT o token privati.
