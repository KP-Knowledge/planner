import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const AUTH_FILE = "e2e/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
    },
  ],
  webServer: {
    command: "pnpm db:migrate && pnpm build && pnpm start",
    url: `${BASE_URL}/api/health`,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "pipe",
    env: {
      DATABASE_URL: "postgres://planner:planner@localhost:5433/planner",
      AUTH_SECRET: "e2e-auth-secret-e2e-auth-secret-0123456789",
      AUTH_URL: BASE_URL,
      AUTH_TRUST_HOST: "true",
      KEYCLOAK_ISSUER: "http://localhost:8080/realms/planner",
      KEYCLOAK_CLIENT_ID: "planner",
      KEYCLOAK_CLIENT_SECRET: "planner-e2e-secret",
    },
  },
});
