import { expect, test } from "@playwright/test";

const storeKey = "dayxday-structured-tags-v1";

function stateForToday() {
  const today = new Date();
  const date = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return {
    activities: [
      {
        id: 1,
        tagIds: ["focus"],
        start_time_minutes: 60,
        duration_minutes: 60,
        date,
      },
      {
        id: 2,
        tagIds: ["meeting"],
        start_time_minutes: 120,
        duration_minutes: 60,
        date,
      },
    ],
    nextId: 3,
    runningActivity: null,
    lastCaptureUndo: null,
    tagGroups: [
      {
        id: "work",
        name: "Work",
        tags: [
          { id: "focus", name: "Focus" },
          { id: "meeting", name: "Meeting" },
        ],
      },
    ],
    nextTagId: 1,
    nextGroupId: 1,
  };
}

test("mobile timeline fits and activity height matches duration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(
    ({ key, state }) => {
      localStorage.clear();
      localStorage.setItem(key, JSON.stringify(state));
    },
    { key: storeKey, state: stateForToday() },
  );
  await page.reload();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const dimensions = await page
    .locator('[data-activity-id="1"]')
    .evaluate((element) => ({
      renderedHeight: element.getBoundingClientRect().height,
      declaredHeight: Number.parseFloat((element as HTMLElement).style.height),
    }));
  expect(
    Math.abs(dimensions.renderedHeight - dimensions.declaredHeight),
  ).toBeLessThan(0.02);
});

test("follows the system color scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(
    await page.evaluate(() => ({
      prefersDark: matchMedia("(prefers-color-scheme: dark)").matches,
      pageBackground: getComputedStyle(document.body).backgroundColor,
      pageText: getComputedStyle(document.body).color,
      captureBackground: getComputedStyle(
        document.querySelector(".capture-panel")!,
      ).backgroundColor,
      receiptBackground: getComputedStyle(
        document.querySelector(".today-receipt")!,
      ).backgroundColor,
    })),
  ).toEqual({
    prefersDark: true,
    pageBackground: "rgb(18, 18, 18)",
    pageText: "rgb(241, 241, 241)",
    captureBackground: "rgb(32, 32, 32)",
    receiptBackground: "rgb(28, 28, 28)",
  });
  await page.emulateMedia({ colorScheme: "light" });
  await expect
    .poll(() =>
      page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    )
    .toBe("rgb(255, 255, 255)");
});

test("configures tags, captures a combination, and persists it", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("link", { name: "Configure tags" }).click();
  await expect(page).toHaveURL(/\/#\/tags$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible();
  await page.getByLabel("Group name", { exact: true }).fill("Work");
  await page.getByLabel("Initial tag", { exact: true }).fill("Focus");
  await page.getByRole("button", { name: "Create group" }).click();
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page).toHaveURL(/\/#\/$/);
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".capture-current")).toContainText("Focus");
  await page.reload();
  await expect(page.locator(".capture-current")).toContainText("Focus");
  expect(
    await page.evaluate((key) => localStorage.getItem(key) !== null, storeKey),
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("activity")),
  ).toBeNull();
});

test("long tag combinations fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const base = stateForToday();
  const longName = "Extremely-long-unbroken-tag-name-".repeat(4);
  const persisted = {
    ...base,
    activities: [
      { ...base.activities[0], tagIds: ["long"] },
      base.activities[1],
    ],
    runningActivity: {
      tagIds: ["long", "meeting"],
      startedAtMs: Date.now() - 60_000,
    },
    tagGroups: [
      {
        ...base.tagGroups[0],
        tags: [{ id: "long", name: longName }, base.tagGroups[0].tags[1]],
      },
    ],
  };
  await page.goto("/");
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: storeKey, state: persisted },
  );
  await page.reload();

  await expect(page.locator(".capture-current")).toContainText(longName);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("archived tags leave historical display but disappear from capture", async ({
  page,
}) => {
  const state = stateForToday();
  state.tagGroups[0].tags[0] = {
    ...state.tagGroups[0].tags[0],
    archived: true,
  } as (typeof state.tagGroups)[0]["tags"][number];
  await page.goto("/");
  await page.evaluate(
    ({ key, persisted }) =>
      localStorage.setItem(key, JSON.stringify(persisted)),
    { key: storeKey, persisted: state },
  );
  await page.reload();
  await expect(page.locator('[data-activity-id="1"]')).toHaveText("Focus");
  await expect(
    page.getByRole("button", { name: "Focus", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".tag-total-group")).toContainText("Focus");
});

test("dragging the broad closed activity surface still shifts its trailing boundary", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: storeKey, state: stateForToday() },
  );
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
      page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key)!);
        return state.activities.map(
          (activity: {
            duration_minutes: number;
            start_time_minutes: number;
          }) => [activity.duration_minutes, activity.start_time_minutes],
        );
      }, storeKey),
    )
    .toEqual([
      [90, 60],
      [60, 150],
    ]);
});
