import { test, expect } from "@playwright/test";

test("mobile timeline fits and activity height matches its duration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator(".empty-state")).toContainText(
    "Start an activity above",
  );
  await expect(
    page.getByRole("button", { name: "Populate Store" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reset" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const safePastMinute = await page.evaluate(() => {
    const now = new Date();
    const minute =
      now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    return Math.max(0.1, Math.min(200, minute - 0.1));
  });
  await page
    .locator(".time-axis-area")
    .click({ position: { x: 30, y: safePastMinute } });
  const dimensions = await page
    .locator(".activity-item")
    .evaluate((element) => ({
      renderedHeight: element.getBoundingClientRect().height,
      declaredHeight: Number.parseFloat((element as HTMLElement).style.height),
    }));
  expect(
    Math.abs(dimensions.renderedHeight - dimensions.declaredHeight),
  ).toBeLessThan(0.02);
});

test("create, rename, and persist an activity across reload", async ({
  page,
}) => {
  const newName = "Smoke Test Activity";

  // Deterministic start: clear any persisted state.
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Create an activity by clicking the time axis at a guaranteed past time.
  const safePastMinute = await page.evaluate(() => {
    const now = new Date();
    const minute =
      now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    return Math.max(0.1, Math.min(200, minute - 0.1));
  });
  await page
    .locator(".time-axis-area")
    .click({ position: { x: 30, y: safePastMinute } });
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

test("one-tap capture transitions, stops, and undoes", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const today = new Date();
    const date = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    localStorage.setItem(
      "activity",
      JSON.stringify({
        activities: [
          {
            id: 1,
            name: "Focus",
            start_time_minutes: 0,
            duration_minutes: 1,
            date,
          },
        ],
        nextId: 2,
        runningActivity: null,
        lastCaptureUndo: null,
      }),
    );
  });
  await page.reload();

  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(page.locator(".capture-current")).toContainText("Focus");
  await expect(
    page.getByRole("button", { name: "Focus", exact: true }),
  ).toHaveCount(0);

  await page.getByLabel("Other").fill("Meeting");
  await page.getByLabel("Other").press("Enter");
  await expect(page.locator(".capture-current")).toContainText("Meeting");

  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.locator(".capture-current")).toContainText("Not tracking");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".capture-current")).toContainText("Meeting");
});

test("populated capture controls fit a mobile viewport with long names", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    localStorage.setItem(
      "activity",
      JSON.stringify({
        activities: [
          {
            id: 1,
            name: "Extremely-long-unbroken-activity-name-".repeat(4),
            start_time_minutes: 0,
            duration_minutes: 1,
            date,
          },
        ],
        nextId: 2,
        runningActivity: {
          name: "Another-extremely-long-current-activity-name-".repeat(4),
          startedAtMs: Date.now() - 60_000,
        },
        lastCaptureUndo: null,
      }),
    );
  });
  await page.reload();

  await expect(
    page.getByText("Recent activities", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("dragging the broad closed activity surface still shifts its trailing boundary", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const today = new Date();
    const date = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    localStorage.setItem(
      "activity",
      JSON.stringify({
        activities: [
          {
            id: 1,
            name: "First",
            start_time_minutes: 60,
            duration_minutes: 60,
            date,
          },
          {
            id: 2,
            name: "Second",
            start_time_minutes: 120,
            duration_minutes: 60,
            date,
          },
        ],
        nextId: 3,
        runningActivity: null,
        lastCaptureUndo: null,
      }),
    );
  });
  await page.reload();

  const first = page.locator('[data-activity-id="1"]');
  await first.scrollIntoViewIfNeeded();
  const box = await first.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 30);
  await page.mouse.up();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem("activity")!);
        return state.activities.map(
          (activity: {
            duration_minutes: number;
            start_time_minutes: number;
          }) => [activity.duration_minutes, activity.start_time_minutes],
        );
      }),
    )
    .toEqual([
      [90, 60],
      [60, 150],
    ]);
});
