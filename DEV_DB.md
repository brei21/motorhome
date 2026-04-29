# Base de datos local

## Opcion A: Docker

```bash
cd "/Users/pablobreijo/Desktop/personal AI projects/motorhome"
docker compose -f docker-compose.db.yml up -d
```

## Variables recomendadas

`.env.local`

```env
DATABASE_URL=postgresql://motorhome:motorhome@127.0.0.1:5433/motorhome
AUTH_SESSION_SECRET=change-this-local-secret-with-at-least-32-characters
AUTH_BOOTSTRAP_PIN=123456
```

## Opcion B: PostgreSQL Homebrew

Si no tienes Docker CLI disponible pero si PostgreSQL con Homebrew:

```bash
brew services start postgresql@17
psql -d postgres -c "create role motorhome with login password 'motorhome';"
psql -d postgres -c "create database motorhome owner motorhome;"
```

`.env.local`

```env
DATABASE_URL=postgresql://motorhome:motorhome@127.0.0.1:5432/motorhome?gssencmode=disable
AUTH_SESSION_SECRET=change-this-local-secret-with-at-least-32-characters
AUTH_BOOTSTRAP_PIN=123456
```

## Aplicar esquema

```bash
set -a && source .env.local && set +a
npm run db:migrate
```

## Vaciar datos de prueba

```bash
set -a && source .env.local && set +a
npm run db:reset
```
