# Miglioramenti Codex - 2026-06-23

## Interventi inclusi

- Cucina piu efficiente: la board mostra batch di piatti uguali, carico totale, attesa massima, tavoli al pass e priorita subito/dopo.
- Live cucina piu stabile: il refresh realtime non ricrea piu socket a ogni cambio conteggio.
- Backend servizio: `/orders/kitchen/list` restituisce solo ordini attivi del servizio, evitando storico e rumore operativo.
- Stati ordine correggibili: cucina e bar possono riportare un ordine da `ready` a `in_progress` o da `in_progress` a `pending`.
- Menu admin migliorato: pannello qualita catalogo, filtri per categoria/reparto, campi separati per descrizione/allergeni, URL immagine e duplicazione prodotto come bozza offline.
- Menu cliente migliorato: categoria virtuale `Consigliati`, allergeni visibili, ricerca anche per allergene e fix della rotta legacy `/menu/:tavolo`.
- Integrazioni: pagina collegata a router e menu laterale, con roadmap leggibile per pagamenti, POS, fiscale, prenotazioni e delivery.

## Prossime priorita consigliate

- Spezzare lo stato ordine a livello di singolo piatto, non solo ordine intero.
- Aggiungere tempi target per categoria: antipasti, primi, secondi, dolci, bar.
- Introdurre stampanti/reparti reali: cucina calda, fredda, pizzeria, bar.
- Aggiungere upload immagini menu invece del solo URL.
- Separare il bundle frontend in piu chunk per ridurre il warning Vite sopra 500 kB.
