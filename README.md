# Planner

A Gantt-chart planner for projects and tasks, styled after [Instagantt](https://www.instagantt.com). One organization, no roles: everyone who signs in can see and edit every project. Sign-in goes through an existing Keycloak server.

## Features

- Projects, sections, tasks, one level of subtasks and milestones.
- Gantt timeline with drag to move and resize, finish-to-start dependencies (cycles are rejected) and a today line.
- Workday-aware scheduling: Saturday and Sunday are always off, and tasks snap to the next workday. "Today" is computed in `Asia/Bangkok`.
- Holidays: Thai public holidays are seeded on startup for the current and next year. Add, edit or remove holidays per organization or per project.
- Teams with colors, assignees (people who have signed in at least once), progress, task colors.
- English and Thai UI, light and dark theme.

## Stack

Next.js 16 (App Router, standalone output), TypeScript, Tailwind CSS 4, Auth.js v5 with Keycloak, PostgreSQL 18 with Drizzle ORM, TanStack Query, Vitest (PGlite for DB tests), pnpm, Node 22.

## Local development

You need Node 22, pnpm and Docker.

```bash
pnpm install
cp .env.example .env           # fill in AUTH_SECRET and the Keycloak values
docker compose -f docker-compose.dev.yml up -d   # Postgres on localhost:5432
pnpm db:migrate                # apply migrations and seed holidays
pnpm dev                       # http://localhost:3000
```

Optional demo data (a project with sections, tasks, teams and dependencies):

```bash
pnpm db:seed-demo
```

Tests and checks:

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Local dev only | Postgres connection string. `docker-compose.yml` builds it for the container from `POSTGRES_PASSWORD`. |
| `POSTGRES_PASSWORD` | Yes | Password for the `planner` database user. It goes into `DATABASE_URL` unescaped, so use URL-safe characters only (no `@`, `/`, `:` or `#`). |
| `AUTH_SECRET` | Yes | Random secret for Auth.js. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | **Yes in production** | Public base URL, for example `https://planner.example.com`. Sign-in redirects and the Keycloak logout redirect are built from it. Without it the app falls back to the `x-forwarded-host` header. |
| `AUTH_TRUST_HOST` | Yes behind a proxy | Set to `true` behind Dokploy/Traefik so Auth.js trusts the forwarded host headers. Defaults to `true` in `docker-compose.yml`. |
| `KEYCLOAK_ISSUER` | Yes | Realm URL, for example `https://keycloak.example.com/realms/my-realm`. |
| `KEYCLOAK_CLIENT_ID` | Yes | Keycloak client ID. |
| `KEYCLOAK_CLIENT_SECRET` | Yes | Keycloak client secret. |

`docker compose` refuses to start when `AUTH_URL`, `AUTH_SECRET`, `POSTGRES_PASSWORD` or any Keycloak variable is missing.

## Keycloak client setup

Create a client in your realm with these settings:

| Setting | Value |
|---|---|
| Client type | OpenID Connect |
| Client authentication | **On** (confidential client) |
| Standard flow | **On** |
| Valid redirect URIs | `https://<domain>/api/auth/callback/keycloak` |
| Valid post logout redirect URIs | `https://<domain>/signin` |
| Web origins | `https://<domain>` |

Copy the client ID and the secret from the Credentials tab into `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET`. For local dev, use `http://localhost:3000` as `<domain>`.

## Deploy on Dokploy

`docker-compose.yml` defines two services: `planner-app` and `planner-postgres`. The `planner-` prefix avoids service-name collisions with other stacks on the same Dokploy network. Keycloak is not included and must already exist.

1. In Dokploy, create a **Compose** application from this Git repository. Compose path: `./docker-compose.yml`.
2. In the Environment tab, set `POSTGRES_PASSWORD`, `AUTH_SECRET`, `AUTH_URL` (your public `https://` URL), `AUTH_TRUST_HOST=true`, `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET`. Do not set `DATABASE_URL`; the compose file builds it.
3. In the Domains tab, add your domain with service `planner-app`, port `3000`, HTTPS on.
4. Add the Keycloak redirect URIs for that domain (see above), then deploy.

On every container start, `scripts/start.sh` runs `dist/migrate.mjs` (applies SQL migrations from `drizzle/`, then seeds Thai holidays for the current and next year if those years have no seed rows) and then starts the server. `planner-app` has no host port. Traefik reaches it on the internal port 3000. To test on a plain Docker host, uncomment the `ports:` block in `docker-compose.yml`.

Postgres data lives in the `planner-pgdata` volume, mounted at `/var/lib/postgresql` (the Postgres 18 image layout). Back it up before upgrading the image.

Health check: `GET /api/health` returns `{ "ok": true }` after a `select 1`, or 503 `{ "ok": false }`. It needs no session.

## Holiday data

Holidays come from `date-holidays` (Thailand). It has gaps:

- No Buddhist holidays from 2027 onward, because they follow the lunar calendar.
- No substitution days (วันหยุดชดเชย) for any year.

Add the missing days in the Holidays drawer (toolbar of the Gantt view), either for the whole organization or for a single project. Adding or removing a holiday does not move existing tasks. Tasks are re-aligned only when you edit them.

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the dev server. |
| `pnpm build` | Production build (standalone output). |
| `pnpm start` | Run `next start`. |
| `pnpm lint` | ESLint. |
| `pnpm test` | Vitest. |
| `pnpm db:migrate` | Apply migrations and seed holidays against `DATABASE_URL`. Reads `.env` if it exists. |
| `pnpm db:seed-demo` | Create a demo project with sections, tasks, teams and dependencies. Reads `.env` if it exists. |
| `pnpm build:migrate` | Bundle `src/db/migrate.ts` into `dist/migrate.mjs` for the Docker image. |
