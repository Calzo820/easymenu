# Backup database PostgreSQL

## Backup manuale
```bash
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%F-%H%M).dump"
```

## Ripristino
```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup.dump
```

## Policy consigliata
- Backup giornaliero automatico.
- Retention minima: 7 giornalieri, 4 settimanali, 6 mensili.
- Test di ripristino almeno mensile.
- Backup cifrati e non accessibili pubblicamente.

## Prima di migrazioni Prisma
1. Eseguire backup.
2. Verificare spazio disco.
3. Applicare `npm run prisma:deploy`.
4. Controllare `/ready`.
