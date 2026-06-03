# EasyMenu — rilascio operativo pronto vendita

Questa versione è stata ripulita e orientata all'uso reale in ristorante: meno spazio occupato da blocchi descrittivi, più contenuto visibile per cucina, bar e cassa.

## Migliorie applicate

- Navbar più compatta e più coerente con i ruoli: cucina, bar e cassa vedono subito le postazioni operative.
- Rimosso rumore operativo dalla navigazione autenticata: niente link demo/landing dentro il lavoro quotidiano.
- Hero superiori ridotti: restano utili per stato e metriche, ma non rubano spazio agli ordini.
- Card metriche più dense e leggibili su tablet/cassa.
- Refresh cucina/bar più reattivo, ogni 8 secondi oltre agli eventi live socket.
- Stili touch migliorati per pulsanti grandi, card dense e uso su tablet.
- Zip finale senza `node_modules`, `.env` locali e build vecchie: pronta per repository/deploy pulito.

## Criticità ancora da validare prima della vendita

- Testare 1 ora di servizio reale con almeno 3 ruoli aperti: cucina, bar, cassa.
- Verificare che ogni prodotto abbia `preparationArea` corretta: `bar` per bevande, cucina per il resto.
- Configurare dominio, HTTPS, variabili Render e database PostgreSQL di produzione.
- Disattivare o proteggere le demo pubbliche se il cliente finale non deve vederle.
- Preparare contratto/termini, privacy policy e backup database.
