# Checklist rebranding Ordynora

Il codice e gli asset del progetto sono già rinominati. Segui questo ordine per evitare interruzioni del servizio.

## 1. Prima del primo push

1. Conserva una copia delle variabili ambiente attuali di Render senza pubblicarle su Git.
2. Se il servizio esistente è gestito da un Blueprint Render, rinominalo nel pannello da `easymenu-backend` a `ordynora-backend` **prima** di sincronizzare il nuovo `render.yaml`.
3. Non creare un secondo database e non sostituire `DATABASE_URL`.
4. Non rigenerare chiavi Stripe, Brevo, Google o JWT solo per il cambio nome.

## 2. Dominio e posta

- Dominio principale: `ordynora.com`.
- `www.ordynora.com`: reindirizzamento a `ordynora.com`.
- `ordynora.it` e `www.ordynora.it`: reindirizzamento permanente a `ordynora.com`.
- Backend: `api.ordynora.com`.
- Casella pubblica: `support@ordynora.com`.
- Mittente automatico consigliato: `noreply@ordynora.com` oppure `support@ordynora.com`.

In Brevo autentica `ordynora.com`, aggiungi i record DNS richiesti (DKIM/DMARC e gli altri record mostrati dal pannello) e crea il mittente con nome `Ordynora`.

## 3. Render

Rinomina il servizio esistente in `ordynora-backend`; non crearne uno nuovo. Poi aggiungi `api.ordynora.com` in **Settings > Custom Domains** e configura su Aruba i record DNS indicati da Render.

Variabili frontend:

```text
VITE_API_URL=https://api.ordynora.com
VITE_API_TIMEOUT_MS=60000
```

Variabili backend:

```text
CLIENT_URL=https://ordynora.com
FRONTEND_URL=https://ordynora.com
CORS_ORIGIN=https://ordynora.com,https://www.ordynora.com
MAIL_FROM_EMAIL=support@ordynora.com
MAIL_FROM_NAME=Ordynora
```

Mantieni invariate tutte le chiavi e gli ID già funzionanti: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_*`, `BREVO_API_KEY`, `GOOGLE_TRANSLATE_API_KEY` e i segreti di backup.

## 4. Stripe

Nel pannello Stripe aggiorna:

- nome attività pubblico: `Ordynora`;
- logo, icona e colori del Checkout;
- email e sito di assistenza;
- descrittore estratto conto: `ORDYNORA`;
- nomi e immagini dei prodotti/abbonamenti che mostrano ancora il vecchio marchio;
- portale cliente, ricevute e fatture;
- endpoint webhook a `https://api.ordynora.com/payments/webhook`.

Se Stripe usa due destinazioni, una per l'account della piattaforma e una per gli account Connect, entrambe possono puntare allo stesso URL ma ciascuna deve conservare il proprio signing secret nelle variabili `STRIPE_WEBHOOK_SECRET` e `STRIPE_CONNECT_WEBHOOK_SECRET`.

Non ricreare prodotti, prezzi o abbonamenti solo per rinominarli. I Product possono essere modificati; gli ID Price già usati dal codice devono restare invariati.

## 5. Git e GitHub

Rinomina il repository in `ordynora`. GitHub mantiene i reindirizzamenti, ma aggiorna comunque il remote locale:

```bash
git remote set-url origin https://github.com/TUO-UTENTE/ordynora.git
git remote -v
git status
git add .
git commit -m "Rebrand completo da EasyMenu a Ordynora"
git push
```

Sostituisci `TUO-UTENTE` con il nome corretto del tuo account GitHub.

## 6. Altri servizi

- Aruba: account intestato alla persona; dominio, DNS e caselle email intestati al progetto.
- Google Cloud Translation: rinomina solo il nome visibile del progetto o della chiave se vuoi; non cambiare la chiave funzionante.
- Neon/Postgres: nome visibile facoltativo; non creare un nuovo database.
- LegalBlink o altro servizio legale: aggiorna marchio, dominio, email, titolare e documenti incorporati nel sito.
- Vercel, se ospita il frontend: rinomina il progetto, collega `ordynora.com` e aggiorna `VITE_API_URL`.

## 7. Verifica finale

1. `https://ordynora.com` apre la landing senza avvisi tecnici.
2. `https://api.ordynora.com/ready` risponde correttamente.
3. Login owner e accesso staff funzionano.
4. Le lingue verificate funzionano anche senza traduzione automatica; le altre compaiono quando `GOOGLE_TRANSLATE_API_KEY` è configurata.
5. Una mail di verifica arriva da Ordynora.
6. Checkout e portale cliente mostrano Ordynora.
7. Stripe riceve correttamente un evento di prova sul nuovo webhook.
8. `ordynora.it` reindirizza a `ordynora.com`.

Mantieni attivi i vecchi indirizzi Render e webhook finché tutti questi controlli non sono superati.
