# REST Route Handlers with Zod and Drizzle, not Server Actions or Prisma

The API is REST, built with Next.js Route Handlers under `/api/*`. Zod validates input at the boundary. Thin handlers call services in `src/server/*`, and every service takes a Drizzle `db` argument. Data goes to Postgres through Drizzle, with migrations kept as plain SQL files. Explicit REST endpoints were a requirement, and they keep the API usable outside the React tree. Passing `db` in lets the integration tests run the real migrations against in-memory PGlite, with no Postgres container.

## Considered Options

- Server Actions: rejected because they tie the API to React components.
- Prisma: rejected because it is heavier and its migrations are less transparent than Drizzle's SQL files.
