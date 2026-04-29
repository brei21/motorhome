# Motorhome

Aplicacion Next.js para gestionar diario de viaje, rutas, odometro, combustible, mantenimiento y seguridad por PIN de una autocaravana.

## Stack real

- Next.js App Router
- React + TypeScript
- PostgreSQL con `pg`
- Leaflet para mapas
- CSS modules + estilos globales
- Backup/importacion JSON desde Ajustes
- Ficha tecnica del vehiculo, auditoria local y detalle de viaje

## Variables de entorno

Necesarias en runtime:

- `DATABASE_URL`
- `AUTH_SESSION_SECRET`

Bootstrap de PIN, elige una opcion:

- `AUTH_PIN_HASH` (recomendado en produccion)
- `AUTH_BOOTSTRAP_PIN` (util para primer arranque)

Puedes generar un hash listo para Railway con el PIN que quieras usar:

```bash
npm run pin:hash -- <tu-pin>
```

Ejemplo:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
AUTH_SESSION_SECRET=replace-with-a-long-random-secret-of-at-least-32-characters
AUTH_PIN_HASH=pbkdf2_sha256$...
```

En produccion usa `AUTH_PIN_HASH` siempre que sea posible. `AUTH_BOOTSTRAP_PIN` solo es recomendable para el primer arranque y despues conviene cambiar el PIN desde Ajustes.

## Desarrollo local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia el ejemplo de entorno:

   ```bash
   cp env.example .env.local
   ```

3. Levanta PostgreSQL local:

   ```bash
   docker compose -f docker-compose.db.yml up -d
   ```

4. Aplica el esquema:

   ```bash
   set -a && source .env.local && set +a
   npm run db:migrate
   ```

5. Arranca la app:

   ```bash
   npm run dev -- --hostname 127.0.0.1 --port 3001 --webpack
   ```

## Limpiar la base local

Para vaciar todos los datos de prueba:

```bash
set -a && source .env.local && set +a
npm run db:reset
```

## Datos y backup

Desde `/settings` puedes:

- Exportar un backup JSON completo de viajes, diario, combustible, taller, odometro, favoritos y perfil del vehiculo.
- Importar/restaurar un backup previo. La restauracion sustituye los datos de viaje, pero no cambia el PIN.
- Borrar los datos de viaje con confirmacion manual `RESET`.
- Gestionar la ficha tecnica del vehiculo.
- Revisar las ultimas acciones criticas registradas.

Las acciones destructivas de importacion/restauracion y reset piden PIN de nuevo.

## Flujos principales

- `/current-trip`: modo concentrado del viaje activo.
- `/odometer`: inicio/cierre de viaje, paradas favoritas y bitacora de viajes.
- `/trips/[id]`: detalle de viaje con timeline unificado.
- `/daily`: registro diario con GPS, etiquetas y busqueda.
- `/fuel`: repostajes vinculados al viaje activo y consumo real.
- `/maintenance`: tareas, avisos por km/fecha y relacion con viaje activo.

El esquema de base de datos vive en `db/schema.sql` y se aplica con:

```bash
npm run db:migrate
```

## Despliegue en Railway

Objetivo recomendado: crear primero un entorno `staging` y probarlo desde iPad con HTTPS antes de usarlo como produccion.

1. Sube el repo a GitHub.
2. En Railway, crea un proyecto nuevo o entorno `staging` con:
   - un servicio Web desde tu repo de GitHub
   - una base Railway PostgreSQL
3. En el servicio Web, referencia `DATABASE_URL` desde el servicio PostgreSQL de Railway.
4. Define tambien:
   - `AUTH_SESSION_SECRET`
   - `AUTH_PIN_HASH`
5. Railway usa `railway.json`:
   - build: `npm run build`
   - pre-deploy: `npm run db:migrate`
   - start: `npm run start`
   - healthcheck: `/api/health`

Antes del primer despliegue, genera el hash del PIN:

```bash
npm run pin:hash -- <tu-pin>
```

Y guarda el resultado como `AUTH_PIN_HASH`.

Genera un secreto de sesion largo, por ejemplo:

```bash
openssl rand -base64 48
```

Y guarda el resultado como `AUTH_SESSION_SECRET`.

## Checklist staging

Antes de considerar staging como produccion:

- Login con PIN desde Safari iPad.
- Permiso GPS en `/current-trip` y `/daily`.
- Iniciar viaje desde `/odometer`.
- Guardar registro diario de viaje.
- Guardar repostaje.
- Finalizar viaje.
- Exportar backup JSON.
- Resetear datos y restaurar backup.
- Revisar `/api/health` en Railway.

## Seguridad

- El PIN no se guarda en claro; se deriva con PBKDF2.
- La sesion usa cookie `httpOnly` firmada.
- Hay limitacion de intentos fallidos.
- El PIN puede cambiarse desde `/settings` una vez autenticado.
- Los eventos criticos se registran en `action_audit_logs`.
- Los backups no exportan `auth_settings` ni intentos de login.
