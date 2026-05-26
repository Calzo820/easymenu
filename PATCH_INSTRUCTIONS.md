# Istruzioni patch EasyMenu

Questa zip contiene solo i file da sovrascrivere nella tua cartella progetto. Non contiene `node_modules` e non contiene `.env` reali.

## Come applicarla

1. Fai un backup della cartella attuale.
2. Apri la cartella principale del progetto, quella dove ci sono `package.json`, `README.md`, `src/` e `backend/`.
3. Copia il contenuto di `easymenu-security-patch/` sopra la tua cartella progetto, accettando la sovrascrittura dei soli file inclusi.
4. Rimuovi manualmente i file/cartelle indicati sotto.
5. Rigenera dipendenze e Prisma.

## Da rimuovere dalla tua cartella

Elimina questi elementi se presenti:

```txt
node_modules/
backend/node_modules/
dist/
dist-ssr/
.env
.env.local
.env.production
backend/.env
backend/.env.local
backend/.env.production
ristorante/ristorante/
```

La cartella `ristorante/ristorante/` va rimossa solo se è una copia duplicata annidata del progetto. Prima controlla di non avere modifiche uniche lì dentro.

## Comandi consigliati dopo la pulizia

```bash
npm install
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
cd ..
npm run build
```

In sviluppo puoi usare `npx prisma migrate dev` al posto di `migrate deploy`.

## Segreti da ruotare subito

I segreti erano nella zip originale. Considerali compromessi e cambiali nei rispettivi pannelli:

- Neon/Postgres: ruota la password o crea una nuova connection string.
- Stripe: revoca la test key esposta e creane una nuova.
- JWT: genera un nuovo `JWT_SECRET` lungo e casuale.

Esempio per generare JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Cosa cambia con questa patch

- Blocca JWT secret assenti/deboli.
- Rimuove l'accesso socket pubblico alla room ristorante.
- Rende idempotente `clientRequestId` per ristorante/tavolo/sessione.
- Sostituisce `count()+1` con contatore atomico per numerazione ordini.
- Porta gli importi Prisma a `Decimal`.
- Esegue escaping HTML nella ricevuta.
- Aggiorna `.gitignore`, `.env.example` e README.
