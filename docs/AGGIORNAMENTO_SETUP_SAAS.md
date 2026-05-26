# Aggiornamento Setup SaaS

Questo aggiornamento aggiunge una pagina operativa `/onboarding` pensata per preparare un ristorante alla vendita e all'utilizzo reale.

## Cosa è stato aggiunto

- Pagina **Setup SaaS / Centro lancio ristorante** protetta per owner/admin.
- Checklist vendita con controlli su brand, menu, tavoli/QR, billing, ordine test e qualità.
- Salvataggio rapido di nome ristorante, colore, valuta e logo tramite endpoint esistente `/restaurants/me`.
- KPI sintetici collegati agli analytics già presenti: incasso oggi, ordini, tavoli attivi e alert.
- Link diretto in navbar alla nuova pagina **Setup**.
- Rotta frontend `/onboarding`.
- Rotta backend opzionale `/dashboard/owner` corretta e protetta.

## Correzioni incluse

- Rimossa dalla query analytics la ricerca dello stato pagamento `failed`, non presente nell'enum Prisma `PaymentStatus`.
- Sistemato il file `backend/routes/dashboard.js`, che prima non aveva import/export completi e usava campi non coerenti con lo schema (`total` invece di `totalAmount`).

## Verifica eseguita

- `npm run build` frontend: completato con successo.
- Nota: Vite segnala solo un warning sul bundle oltre 500 kB; non blocca la build.
