# Refactoring prioritario

Questa patch introduce componenti/hook riusabili senza riscrivere completamente i flussi di sala.

## Componenti pronti
- `src/hooks/usePersistentState.js`: stato React sincronizzato con `localStorage`.
- `src/components/orders/OrderStatusBadge.jsx`: badge unico per gli stati ordine.

## Passi consigliati
1. Estrarre da `Cliente.jsx`: caricamento menu, carrello, riepilogo ordine, pagamento.
2. Estrarre da `Cucina.jsx` e `Bar.jsx`: lista ordini, filtri, azioni stato.
3. Estrarre da `Cassa.jsx`: sessione tavolo, extra/sconti, chiusura conto.
4. Spostare chiamate API in servizi dedicati (`src/services/orders.js`, `src/services/tables.js`).
