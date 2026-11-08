import { expect, test as setup } from "@playwright/test";

setup("sign in through Keycloak", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/signin/);
  await page.getByRole("button", { name: "Sign in with Keycloak" }).click();

  await page.locator("#username").fill("e2e");
  await page.locator("#password").fill("e2e-password");
  await page.locator("#kc-login").click();

  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
