# Dominio e app EasyMenu

## Struttura consigliata

- `tuodominio.it`: sito e applicazione EasyMenu
- `www.tuodominio.it`: reindirizzamento al dominio principale
- `api.tuodominio.it`: backend EasyMenu
- `tuodominio.it/staff`: accesso rapido tramite PIN

La PWA usa lo stesso frontend del sito. Non serve pubblicare subito EasyMenu negli store: su Android e iPhone può essere aggiunta alla schermata Home e si apre come un'app.

## 1. Dominio frontend su Render

1. Apri il servizio Render del frontend.
2. Vai in `Settings` e poi `Custom Domains`.
3. Seleziona `Add Custom Domain`.
4. Inserisci `tuodominio.it`.
5. Copia esattamente i record DNS mostrati da Render nel pannello del provider del dominio.
6. Rimuovi eventuali record `AAAA` incompatibili.
7. Torna su Render e premi `Verify`.

Render aggiunge anche `www` e gestisce automaticamente HTTPS.

## 2. Dominio backend su Render

1. Apri il servizio `easymenu-backend`.
2. Vai in `Settings` e poi `Custom Domains`.
3. Aggiungi `api.tuodominio.it`.
4. Nel provider DNS crea il record indicato da Render, normalmente un `CNAME` verso il sottodominio backend `onrender.com`.
5. Torna su Render e premi `Verify`.

## 3. Variabili frontend

Nel servizio frontend:

```text
VITE_API_URL=https://api.tuodominio.it
VITE_API_TIMEOUT_MS=60000
```

Avvia un nuovo deploy dopo averle salvate.

## 4. Variabili backend

Nel servizio backend:

```text
CLIENT_URL=https://tuodominio.it
FRONTEND_URL=https://tuodominio.it
CORS_ORIGIN=https://tuodominio.it,https://www.tuodominio.it
```

Mantieni tutte le altre variabili già presenti.

## 5. Stripe

Nel pannello Stripe aggiorna o aggiungi l'endpoint webhook:

```text
https://api.tuodominio.it/payments/webhook
```

Se crei un nuovo endpoint, copia il nuovo `Signing secret` nella variabile Render `STRIPE_WEBHOOK_SECRET`. Il pagamento dal tavolo resta disattivato fino alla futura attivazione commerciale.

## 6. Verifica finale

1. Apri `https://tuodominio.it`.
2. Apri `https://tuodominio.it/staff`.
3. Controlla `https://api.tuodominio.it/ready`.
4. Crea un accesso PIN dalla sezione Staff.
5. Apri il link Staff sul telefono.
6. Installa EasyMenu dalla proposta del browser o da `Aggiungi alla schermata Home`.
7. Verifica che ogni ruolo apra la propria pagina.

Non disattivare subito i vecchi indirizzi `onrender.com`: mantienili disponibili finché dominio, login, socket e webhook non sono stati verificati.
