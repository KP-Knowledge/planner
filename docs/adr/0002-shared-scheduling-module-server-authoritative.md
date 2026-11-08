# One pure scheduling module, shared by client and server; the server is authoritative

Workday math and dependency cascading live in pure TypeScript (`src/lib/dates.ts`, `workdays.ts`, `schedule.ts`) with no Node or DB imports. The client uses them for live drag previews and optimistic updates. The server runs the same functions inside a transaction on every task PATCH and dependency create, and its result replaces the client's guess. Using one implementation means the preview and the saved result can't drift apart. Running it on the server keeps the stored data consistent no matter what a client sends.

## Consequences

- A drag sends one PATCH with only the dragged task's final dates. The server recomputes the cascade and returns every task it moved.
- Any change to scheduling rules must go into `src/lib/schedule.ts`, never into a route handler or a component.
