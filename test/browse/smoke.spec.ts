import { test, expect } from "@playwright/test";

test("create, rename, and persist an activity across reload", async ({
  page,
}) => {
  const newName = "Smoke Test Activity";

  // Deterministic start: clear any persisted state.
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Create an activity by clicking the time axis.
  await page.locator(".time-axis-area").click({ position: { x: 30, y: 200 } });
  // Fresh store: the first created activity gets id 1.
  const item = page.locator('[data-activity-id="1"]');
  await expect(item).toHaveText("New Activity");

  // Rename: double-click to edit, replace the text, commit with Enter.
  await item.dblclick();
  await item.fill(newName);
  await item.press("Enter");
  await expect(item).toHaveText(newName);

  // Reload and assert the rename survived (localStorage persistence).
  await page.reload();
  await expect(page.locator('[data-activity-id="1"]')).toHaveText(newName);
});
