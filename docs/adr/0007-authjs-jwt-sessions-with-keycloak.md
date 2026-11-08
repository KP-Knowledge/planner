# Auth.js v5 with stateless JWT sessions against an existing Keycloak

Sign-in uses Auth.js v5 with its Keycloak provider and a confidential client in a realm that already exists. Sessions are encrypted JWT cookies, so there is no session table. A user row is created or updated from the Keycloak profile at sign-in. That is how people become available as assignees. The Keycloak `id_token` is kept only inside the JWT, never in the client-visible session, so that sign-out can end the Keycloak session too (`/api/auth/federated-logout`).

We chose this over writing the OIDC flow by hand with `openid-client`, and over calling the Keycloak Admin API with a service account to list users.

## Consequences

- A session stays valid until the JWT expires (Auth.js default: 30 days), even if the user is disabled in Keycloak.
- Only users who have signed in at least once can be assigned to tasks.
- `AUTH_URL` is required in production. The sign-in and logout redirect URLs are built from it.
