# Database Setup Guide

This project supports both SQLite (LibSQL) and PostgreSQL databases. Here's how to configure and use each option.

## Supported Database Types

### 1. SQLite (LibSQL) - Default
- **Development**: File-based SQLite database
- **Production**: LibSQL cloud service (Turso) or file-based
- **Configuration**: `src/server/db/index.ts` (default)
- **Schema**: `src/server/db/schema.ts`

### 2. PostgreSQL - Optional
- **Development**: Local PostgreSQL instance
- **Production**: PostgreSQL cloud service (AWS RDS, Supabase, etc.)
- **Configuration**: `src/server/db/postgres.ts`
- **Schema**: `src/server/db/schema-postgres.ts`

## Quick Start

### Using SQLite (Default)

1. **Development**:
   ```bash
   # Uses file:./dev.db by default
   npm run dev
   ```

2. **Production with Turso**:
   ```bash
   # Set DATABASE_URL to your Turso URL
   export DATABASE_URL="libsql://your-db.turso.io"
   npm run build
   npm start
   ```

3. **Database operations**:
   ```bash
   npm run db:generate    # Generate migrations
   npm run db:migrate     # Run migrations
   npm run db:push        # Push schema changes
   npm run db:studio      # Open Drizzle Studio
   ```

### Using PostgreSQL

1. **Setup PostgreSQL**:
   ```bash
   # Install PostgreSQL locally or use a cloud service
   # Set your DATABASE_URL
   export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   ```

2. **Database operations**:
   ```bash
   npm run db:generate:postgres    # Generate PostgreSQL migrations
   npm run db:migrate:postgres     # Run PostgreSQL migrations
   npm run db:push:postgres        # Push PostgreSQL schema changes
   npm run db:studio:postgres      # Open Drizzle Studio for PostgreSQL
   ```

3. **Use in your code**:
   ```typescript
   // For PostgreSQL operations
   import { dbPostgres } from "~/server/db/postgres";
   
   // Your PostgreSQL queries here
   const users = await dbPostgres.select().from(usersTable);
   ```

## Environment Variables

### Required
- `DATABASE_URL`: Database connection string

### Supported URL Formats

#### SQLite/LibSQL
- `file:./dev.db` - Local file database
- `libsql://your-db.turso.io` - Turso cloud
- `wss://your-db.turso.io` - Turso WebSocket
- `https://your-db.turso.io` - Turso HTTP

#### PostgreSQL
- `postgresql://user:password@localhost:5432/dbname`
- `postgres://user:password@localhost:5432/dbname`

## Migration Strategy

### From SQLite to PostgreSQL

1. **Export data from SQLite**:
   ```bash
   # Use SQLite tools to export your data
   sqlite3 dev.db .dump > data.sql
   ```

2. **Set up PostgreSQL**:
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   npm run db:migrate:postgres
   ```

3. **Import data** (manual process):
   - Convert SQLite data to PostgreSQL format
   - Import using PostgreSQL tools

### From PostgreSQL to SQLite

1. **Export data from PostgreSQL**:
   ```bash
   pg_dump your_database > data.sql
   ```

2. **Set up SQLite**:
   ```bash
   export DATABASE_URL="file:./dev.db"
   npm run db:migrate
   ```

3. **Import data** (manual process):
   - Convert PostgreSQL data to SQLite format
   - Import using SQLite tools

## Production Deployment

### Option 1: LibSQL (Recommended)
- **Turso**: Cloud-hosted LibSQL service
- **Benefits**: Serverless, edge-ready, easy scaling
- **Setup**: Create account at turso.tech

### Option 2: PostgreSQL
- **Cloud providers**: AWS RDS, Supabase, PlanetScale, etc.
- **Benefits**: Full SQL features, mature ecosystem
- **Setup**: Create PostgreSQL instance with your provider

## Troubleshooting

### Common Issues

1. **URL_SCHEME_NOT_SUPPORTED Error**:
   - Ensure your DATABASE_URL uses a supported format
   - For LibSQL: use `libsql://`, `file://`, `wss://`, `https://`
   - For PostgreSQL: use `postgresql://` or `postgres://`

2. **TypeScript Union Type Errors**:
   - Use the appropriate database configuration
   - For PostgreSQL: import from `~/server/db/postgres`
   - For SQLite: import from `~/server/db/index` (default)

3. **Migration Issues**:
   - Ensure you're using the correct configuration file
   - Check that your DATABASE_URL is set correctly
   - Verify database permissions

### Getting Help

- Check the [Drizzle documentation](https://orm.drizzle.team/)
- Review the [LibSQL documentation](https://libsql.org/)
- Check the [PostgreSQL documentation](https://www.postgresql.org/docs/)

## Best Practices

1. **Development**: Use SQLite for faster development
2. **Production**: Choose based on your needs:
   - LibSQL for serverless/edge applications
   - PostgreSQL for complex queries and enterprise features
3. **Migrations**: Always test migrations in a development environment first
4. **Backups**: Regular backups are essential for production
5. **Monitoring**: Set up database monitoring and alerts
