# Manuale ristoratore EasyMenu

## 1. Accesso e ristorante
1. Accedi con l'utente owner del ristorante.
2. Controlla in alto nella navbar che il ristorante attivo sia corretto.
3. Ogni menu, tavolo, ordine, QR e pagamento viene salvato con `restaurantId`: i dati non si mischiano tra ristoranti diversi.

## 2. Gestione menu
1. Vai in **Admin**.
2. Aggiungi un prodotto con nome, prezzo, categoria e area di preparazione: `kitchen` per cucina, `bar` per bevande.
3. Inserisci `imageUrl` per mostrare una foto prodotto.
4. Usa il toggle disponibilità per segnare un prodotto come **esaurito**: sparisce dal menu pubblico ma resta nello storico.
5. Modifica o elimina prodotti senza toccare gli ordini già ricevuti: negli ordini vengono conservati nome e prezzo snapshot.

## 3. Tavoli e QR
1. Vai in **Tavoli** e crea i tavoli reali del locale.
2. Vai in **QR**.
3. Stampa un QR per ogni tavolo.
4. Il cliente apre `/menu/:slug/:tableToken`, quindi il sistema sa quale ristorante e quale tavolo sta ordinando.

## 4. Ordini cliente
1. Il cliente apre il QR, seleziona prodotti e invia l'ordine.
2. Il backend valida che il tavolo appartenga al ristorante giusto.
3. I prodotti non disponibili o eliminati non possono essere ordinati.
4. L'ordine apre automaticamente una sessione tavolo se non esiste già.

## 5. Cucina, bar e cassa live
1. **Cucina** vede solo gli articoli non bar.
2. **Bar** vede solo le bevande.
3. **Cassa** vede tavoli, pagamenti, extra, richieste conto e chiamate staff.
4. Gli schermi ricevono aggiornamenti live via Socket.io e suono. Il polling resta come backup leggero.

## 6. Ruoli consigliati
- `owner`: vede tutto e gestisce configurazione, billing, log.
- `admin`: come owner operativo.
- `kitchen`: solo cucina.
- `bar`: solo bar.
- `cashier`: cassa, pagamenti, tavoli attivi.

## 7. Pagamenti Stripe
1. Configura `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` nel backend.
2. Ogni checkout Stripe salva una `PaymentTransaction` legata a ristorante e ordine.
3. I webhook aggiornano ordine e pagamenti.
4. Pagamenti falliti, checkout scaduti e webhook non validi finiscono in **Log errori**.

## 8. Log errori e backup operativo
1. Vai in **Log errori**.
2. Controlla log aperti e problemi pagamento.
3. Segna come risolto solo dopo verifica manuale.
4. Consiglio produzione: aggiungi backup automatico Postgres giornaliero dal provider hosting e conserva almeno 7-30 giorni.

## 9. Routine giornaliera
1. Prima del servizio: controlla disponibilità prodotti e QR tavoli.
2. Durante il servizio: tieni aperti Cucina, Bar e Cassa.
3. Dopo il servizio: controlla Storico, Statistiche e Log errori.
