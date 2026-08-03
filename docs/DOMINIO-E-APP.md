# Dominio e app Ordynora

## Struttura consigliata

- `ordynora.com`: sito e applicazione Ordynora (dominio principale)
- `www.ordynora.com`: reindirizzamento al dominio principale
- `api.ordynora.com`: backend Ordynora
- `ordynora.it` e `www.ordynora.it`: reindirizzamento permanente a `ordynora.com`
- `ordynora.com/staff`: accesso rapido tramite PIN

La PWA usa lo stesso frontend del sito. Non serve pubblicare subito Ordynora negli store: su Android e iPhone può essere aggiunta alla schermata Home e si apre come un'app.

## 1. Dominio frontend su Render

1. Apri il servizio Render del frontend.
2. Vai in `Settings` e poi `Custom Domains`.
3. Seleziona `Add Custom Domain`.
4. Inserisci `ordynora.com`.
5. Copia esattamente i record DNS mostrati da Render nel pannello del provider del dominio.
6. Rimuovi eventuali record `AAAA` incompatibili.
7. Torna su Render e premi `Verify`.

Render aggiunge anche `www` e gestisce automaticamente HTTPS.

## 2. Dominio backend su Render

1. Apri il servizio `ordynora-backend`.
2. Vai in `Settings` e poi `Custom Domains`.
3. Aggiungi `api.ordynora.com`.
4. Nel provider DNS crea il record indicato da Render, normalmente un `CNAME` verso il sottodominio backend `onrender.com`.
5. Torna su Render e premi `Verify`.

## 3. Variabili frontend

Nel servizio frontend:

```text
VITE_API_URL=https://api.ordynora.com
VITE_API_TIMEOUT_MS=60000
```

Avvia un nuovo deploy dopo averle salvate.

## 4. Variabili backend

Nel servizio backend:

```text
CLIENT_URL=https://ordynora.com
FRONTEND_URL=https://ordynora.com
CORS_ORIGIN=https://ordynora.com,https://www.ordynora.com
```

Mantieni tutte le altre variabili già presenti.

## 5. Stripe

Nel pannello Stripe aggiorna o aggiungi l'endpoint webhook:

```text
https://api.ordynora.com/payments/webhook
```

Se crei un nuovo endpoint, copia il nuovo `Signing secret` nella variabile Render `STRIPE_WEBHOOK_SECRET`. Il pagamento dal tavolo resta disattivato fino alla futura attivazione commerciale.

## 6. Verifica finale

1. Apri `https://ordynora.com`.
2. Apri `https://ordynora.com/staff`.
3. Controlla `https://api.ordynora.com/ready`.
4. Crea un accesso PIN dalla sezione Staff.
5. Apri il link Staff sul telefono.
6. Installa Ordynora dalla proposta del browser o da `Aggiungi alla schermata Home`.
7. Verifica che ogni ruolo apra la propria pagina.

Non disattivare subito i vecchi indirizzi `onrender.com`: mantienili disponibili finché dominio, login, socket e webhook non sono stati verificati.
