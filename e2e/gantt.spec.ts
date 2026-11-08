import { expect, test, type Locator, type Page } from "@playwright/test";

const PX_PER_DAY_DAY_ZOOM = 36;

/** Parses "A, Nov 9, 2026 to Nov 9, 2026, 0% complete" from a task row label. */
async function rowDates(row: Locator): Promise<{ start: number; end: number }> {
  const label = (await row.getAttribute("aria-label")) ?? "";
  const m = label.match(/, (.+?) to (.+?), \d+% complete$/);
  if (!m) throw new Error(`Unexpected task label: ${label}`);
  return { start: Date.parse(`${m[1]} UTC`), end: Date.parse(`${m[2]} UTC`) };
}

const taskRow = (page: Page, name: string) =>
  page.getByRole("row", { name: new RegExp(`^${name}, .* to .*% complete$`) });

async function addTask(page: Page, name: string) {
  await page.getByRole("button", { name: "+ Add task" }).click();
  const input = page.getByRole("textbox", { name: "Add task" });
  await input.fill(name);
  await input.press("Enter");
  await expect(taskRow(page, name)).toBeVisible();
  await input.press("Escape");
}

test("plan a project end to end", async ({ page }) => {
  const projectName = `E2E project ${Date.now()}`;

  await page.goto("/");
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByLabel("Name").fill(projectName);
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("link", { name: projectName }).click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

  await page.getByRole("button", { name: "+ Add section" }).click();
  const sectionInput = page.getByRole("textbox", { name: "Add section" });
  await sectionInput.fill("Phase 1");
  await sectionInput.press("Enter");
  await sectionInput.press("Escape");
  await expect(page.getByRole("row", { name: /^Section Phase 1/ })).toBeVisible();

  await addTask(page, "Task A");
  await addTask(page, "Task B");

  await page.getByRole("group", { name: "Zoom" }).getByRole("button", { name: "Day" }).click();

  const barA = page.getByRole("button", { name: /^Task A, / });
  const barB = page.getByRole("button", { name: /^Task B, / });
  await barA.scrollIntoViewIfNeeded();

  const linkHandle = (bar: Locator) => bar.locator("circle");
  const handleBox = async (bar: Locator) => {
    const box = await linkHandle(bar).boundingBox();
    if (!box) throw new Error("link handle has no box");
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  // Link A -> B by dragging A's handle onto B's bar.
  await barA.hover();
  const from = await handleBox(barA);
  const bBox = await barB.locator("rect").nth(1).boundingBox();
  if (!bBox) throw new Error("bar B has no box");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: /^Dependency from Task A to Task B/ })).toBeAttached();

  // Drag A's right edge 3 days.
  const before = await rowDates(taskRow(page, "Task A"));
  await barA.hover();
  const endHandle = barA.locator("rect.cursor-ew-resize").nth(1);
  const hb = await endHandle.boundingBox();
  if (!hb) throw new Error("resize handle has no box");
  const hx = hb.x + hb.width / 2;
  const hy = hb.y + hb.height / 2;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + PX_PER_DAY_DAY_ZOOM * 3, hy, { steps: 10 });
  await page.mouse.up();

  await expect
    .poll(async () => (await rowDates(taskRow(page, "Task A"))).end)
    .toBeGreaterThan(before.end);
  await expect
    .poll(async () => {
      const a = await rowDates(taskRow(page, "Task A"));
      const b = await rowDates(taskRow(page, "Task B"));
      return b.start > a.end;
    })
    .toBe(true);

  // Theme.
  await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  // Locale.
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "ไทย" }).click();
  await expect(page.getByRole("link", { name: "ทีม" })).toBeVisible();

  // Sign out.
  await page.getByRole("link", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/\/signin$/);
});
