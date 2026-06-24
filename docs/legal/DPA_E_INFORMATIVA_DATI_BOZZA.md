# DPA e informativa trattamento dati - bozza operativa

> Bozza per contratti B2B. Da far validare prima della vendita.

## Ruoli
- Ristorante: titolare del trattamento verso clienti finali e staff.
- EasyMenu: responsabile del trattamento per hosting, gestione piattaforma, log tecnici e supporto.
- Stripe: autonomo titolare/responsabile per i dati pagamento secondo il proprio contratto.

## Categorie dati
- Staff ristorante: nome, email, ruolo, stato accesso.
- Clienti finali: dati ordine, tavolo, eventuali note, eventuale nome se inserito.
- Pagamenti: stato pagamento, id transazione, provider, importi tecnici.
- Log: errori, audit supporto, problemi pagamento.

## Misure organizzative
- Accessi separati per owner, admin, cucina, bar, cassa.
- Superadmin con accesso limitato e motivo supporto obbligatorio.
- Dati economici privati non visibili al superadmin salvo necessita o consenso.
- Logging degli errori e degli accessi supporto.
- Backup database con retention definita.

## Subfornitori da completare
- Hosting: Render o provider effettivo.
- Database: provider PostgreSQL effettivo.
- Pagamenti: Stripe.
- Email/SMS/notifiche: da indicare se aggiunti.

## Checklist pre-vendita
- Contratto SaaS firmato.
- DPA allegato al contratto.
- Privacy policy pubblica.
- Cookie policy pubblica.
- Procedura cancellazione/esportazione dati.
- Procedura supporto con consenso documentato.
