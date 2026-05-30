# Roadmap competitiva EasyMenu — ROI, integrazioni, sicurezza

## Posizionamento
EasyMenu non deve essere venduto come “software per menu digitale”, ma come sistema operativo leggero per aumentare la resa del turno.

Promessa principale:

> Riduci gli errori di sala e servi più tavoli con lo stesso personale.

## KPI da mettere in dashboard owner
- Tavoli serviti per turno
- Tempo medio da apertura tavolo a ordine inviato
- Tempo medio ordine → cucina/bar
- Ordini con note/varianti
- Errori segnalati o ordini rifatti
- Incasso per tavolo e per fascia oraria
- Prodotti più ordinati e margine stimato

## Differenziazione rispetto a Menu QR/POS
- Non solo QR: flusso sala → cucina/bar → cassa
- ROI dashboard per il titolare
- Setup assistito e migrazione menu
- Stati ordine e reparti separati
- Roadmap integrazioni con strumenti già usati dal ristoratore

## Integrazioni prioritarie
### Pagamenti
- Stripe già presente come base tecnica
- SumUp
- Nexi

### Fatturazione e cassa
- Fatture in Cloud
- Tilby
- Cassa in Cloud

### Delivery e prenotazioni
- Deliveroo
- Glovo
- TheFork

## Sicurezza repository
Non condividere mai file `.env` reali. Nel repository devono restare solo file `.env.example` senza segreti reali.

Da escludere sempre:

```gitignore
node_modules/
dist/
.env
.env.*
backend/.env
backend/.env.*
```

Eccezioni ammesse:

```gitignore
!.env.example
!.env.production.example
!backend/.env.example
!backend/.env.postgres.example
```

## Prossime evoluzioni prodotto
1. Calcolatore ROI in landing: coperti/turno, costo cameriere, errori medi, incremento stimato.
2. Pannello integrazioni con stato: attiva, in configurazione, roadmap.
3. Design system centralizzato: token colore, spacing, card, badge, button.
4. Code splitting React per ridurre bundle iniziale.
5. Audit mobile completo su menu cliente, dashboard, cucina, bar e cassa.
