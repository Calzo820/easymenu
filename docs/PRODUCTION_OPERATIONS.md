# EasyMenu - operativita di produzione

## Controlli di disponibilita

- `GET /health` conferma che il processo backend risponde.
- `GET /ready` controlla anche database e tabella prenotazioni.
- `GET /system/health` mostra il dettaglio al solo SuperAdmin autenticato.
- Configurando `MONITOR_WEBHOOK_URL`, il backend invia un evento quando il database diventa indisponibile e quando torna operativo.

Un controllo interno non puo inviare avvisi se l'intero processo e spento. Per questo un servizio esterno di uptime deve interrogare `/ready` ogni 5 minuti.

## Backup cifrati

1. Generare `BACKUP_ENCRYPTION_KEY` con almeno 32 caratteri casuali e conservarla fuori da Render.
2. Configurare `BACKUP_UPLOAD_URL` con un endpoint o URL firmato dello storage esterno.
3. Impostare `BACKUP_ENABLED=true`.
4. Eseguire una prova con `npm run backup:run` nella cartella `backend`.
5. Verificare il file con `npm run backup:verify -- percorso/del/file.json.gz.enc`.
6. Verificare ogni mese che un file possa essere scaricato dallo storage.

I file sono compressi e cifrati AES-256-GCM. La chiave non viene inserita nel file e, se viene persa, il backup non e recuperabile.

Il disco locale di un servizio cloud non va considerato un backup permanente. Usare sempre storage esterno e, quando disponibile, anche i backup gestiti del database PostgreSQL.

## Stripe Connect

- L'abbonamento EasyMenu usa `STRIPE_WEBHOOK_SECRET`.
- I pagamenti dei clienti ai ristoranti usano anche `STRIPE_CONNECT_WEBHOOK_SECRET`.
- In Stripe va creato un endpoint webhook per gli eventi degli account collegati verso `/payments/webhook`.
- Eventi minimi: `account.updated`, `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`.

## Post-deploy

1. Controllare `/ready`.
2. Aprire Billing e aggiornare lo stato degli incassi Stripe.
3. Eseguire il test completo con un account demo in un ambiente di prova.
4. Verificare che l'ultima copia cifrata sia presente nello storage.
