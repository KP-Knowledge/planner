# One organization, no roles: every signed-in user can edit everything

The app serves one organization. Anyone who can sign in through the configured Keycloak realm can see and edit every project, team and holiday. There are no roles or per-project memberships, and team membership is not stored. Access is controlled entirely by who exists in the realm.

Archiving a project is a soft delete, not a lock. The UI shows archived projects read-only, but the API still accepts writes to them. Permanent deletion is only allowed for a project that is already archived.

## Consequences

- To limit who can use the app, use a separate realm or a Keycloak authentication-flow rule. The app has no setting for it.
- Adding roles later means adding authorization checks to every route handler, which currently only check that a session exists.
