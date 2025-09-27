# Fix Login Issues in Production

## Problema
Il login non funziona in produzione. Questo è un problema comune con NextAuth.js in ambienti di produzione.

## Soluzioni

### 1. **Variabili d'ambiente mancanti**

Assicurati di avere queste variabili d'ambiente in produzione:

```bash
# Database
DATABASE_URL="your_production_database_url"

# Authentication (almeno 32 caratteri)
AUTH_SECRET="your_32_character_secret_here"
NEXTAUTH_SECRET="your_32_character_secret_here"

# URL della tua applicazione
NEXTAUTH_URL="https://yourdomain.com"

# Environment
NODE_ENV="production"
```

### 2. **Configurazione del database**

Se usi un database esterno (non SQLite locale):

```bash
# Per Turso/LibSQL
DATABASE_URL="libsql://your-database-url"
DATABASE_AUTH_TOKEN="your-auth-token"

# Per PostgreSQL
DATABASE_URL="postgresql://user:password@host:port/database"

# Per MySQL
DATABASE_URL="mysql://user:password@host:port/database"
```

### 3. **Comandi per diagnosticare**

```bash
# Diagnostica completa
pnpm run auth:diagnose

# Verifica le variabili d'ambiente
echo $DATABASE_URL
echo $AUTH_SECRET
echo $NEXTAUTH_URL
```

### 4. **Setup del database in produzione**

```bash
# Genera le migrazioni
pnpm run db:generate

# Applica le migrazioni
pnpm run db:migrate

# Popola con dati di esempio
pnpm run db:seed
```

### 5. **Configurazione HTTPS**

In produzione, assicurati che:
- Il tuo dominio usi HTTPS
- NEXTAUTH_URL punti al dominio corretto con https://
- I cookie sicuri siano abilitati (già configurato nel codice)

### 6. **Debug in produzione**

Aggiungi logging temporaneo per debug:

```bash
# Abilita debug NextAuth
NEXTAUTH_DEBUG=true

# Verifica i log dell'applicazione
# Cerca errori di autenticazione nei log
```

### 7. **Test degli utenti**

Verifica che gli utenti esistano nel database:

```bash
# Usa Drizzle Studio per controllare
pnpm run db:studio

# Oppure usa il comando di diagnostica
pnpm run auth:diagnose
```

### 8. **Problemi comuni**

#### Cookie non funzionano
- Verifica che il dominio sia corretto
- Controlla che HTTPS sia abilitato
- Assicurati che `trustHost: true` sia impostato

#### Database non raggiungibile
- Verifica la connessione di rete
- Controlla le credenziali del database
- Assicurati che il database sia accessibile dall'ambiente di produzione

#### Secret troppo corto
- AUTH_SECRET deve essere almeno 32 caratteri
- Usa un generatore di password sicuro

### 9. **Checklist di produzione**

- [ ] Variabili d'ambiente impostate
- [ ] Database accessibile
- [ ] HTTPS configurato
- [ ] Cookie sicuri abilitati
- [ ] Utenti di test creati
- [ ] Log di debug controllati
- [ ] Test di login funzionante

### 10. **Comandi di emergenza**

Se il login continua a non funzionare:

```bash
# Reset completo del database
rm -f dev.db
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed

# Rebuild dell'applicazione
rm -rf .next
pnpm run build
```

## Supporto

Se il problema persiste:
1. Esegui `pnpm run auth:diagnose` e condividi l'output
2. Controlla i log dell'applicazione per errori specifici
3. Verifica la configurazione del tuo provider di hosting
