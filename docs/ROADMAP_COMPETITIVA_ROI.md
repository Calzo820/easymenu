# Roadmap competitiva EasyMenu — da QR menu a Restaurant Growth OS

## Obiettivo
EasyMenu deve vendere un risultato economico, non un software: più coperti, meno errori, meno passaggi manuali, più margine per tavolo.

## Criticità risolte in questa patch

### 1. Landing orientata al ROI
La home ora comunica risultati concreti:
- riduzione errori sala/cucina/cassa;
- più tavoli serviti con lo stesso personale;
- aumento scontrino medio tramite upsell;
- controllo margine e tempi di servizio.

### 2. Differenziazione competitiva
Il posizionamento passa da “menu digitale / dashboard” a “Restaurant Growth OS”.
La promessa non è avere QR e statistiche, ma collegare ordine, sala, cucina, cassa, analytics e integrazioni.

### 3. Integrazioni strategiche
Aggiunta pagina `/integrazioni` e API backend `/integrations` con stato e priorità per:
- SumUp;
- Nexi;
- Fatture in Cloud;
- Tilby;
- Cassa in Cloud;
- TheFork;
- Deliveroo;
- Glovo.

Nota: le integrazioni sono marcate come `planned` o `discovery` finché non sono disponibili credenziali, accessi API e webhook reali.

### 4. Mobile-first
La landing è stata riscritta con CSS responsive centralizzato, breakpoints e CTA full-width su schermi piccoli.

### 5. Repository hygiene
Non distribuire mai:
- `node_modules/`;
- `backend/node_modules/`;
- `dist/`;
- `.env` reali;
- log, cache, coverage.

## Prossime funzionalità ad alto impatto

### Fase 1 — ROI dashboard
- tempo medio da ordine a presa in carico;
- tempo medio da ordine a pronto;
- tavoli lenti;
- categorie ad alto margine;
- errori/annullamenti per turno;
- coperti per ora.

### Fase 2 — Upsell engine
- suggerimenti dessert/bevande;
- extra automatici su piatti compatibili;
- evidenza piatti ad alto margine;
- bundle pranzo/cena;
- test A/B menu.

### Fase 3 — Integrazioni reali
Priorità consigliata:
1. SumUp/Nexi per pagamenti;
2. Fatture in Cloud per amministrazione;
3. Tilby/Cassa in Cloud per POS;
4. TheFork per prenotazioni;
5. Deliveroo/Glovo per delivery.

## Criterio di vendita
Un ristoratore dovrebbe cambiare software solo se EasyMenu può rispondere a questa domanda:

> Quanto margine in più mi porta entro 30 giorni?

Ogni nuova feature deve quindi essere collegata a un KPI economico.
