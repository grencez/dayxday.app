import { expect, test, type Locator } from "@playwright/test";
import { preview, type PreviewServer } from "vite";

const previewPort = Number(process.env.DAYXDAY_TEST_PORT ?? 4173);
const previewUrl = `http://127.0.0.1:${previewPort}`;
const storeKey = "dayxday-structured-tags-v1";
let previewServer: PreviewServer | undefined;

test.use({ baseURL: previewUrl });
test.beforeAll(async () => {
  previewServer = await preview({
    preview: {
      host: "127.0.0.1",
      port: previewPort,
      strictPort: true,
    },
  });
});
test.afterAll(async () => previewServer?.close());

async function dragByTouch(locator: Locator, deltaY: number) {
  await locator.evaluate((element, movement) => {
    const rect = element.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;
    const touch = (y: number) =>
      new Touch({
        identifier: 1,
        target: element,
        clientX,
        clientY: y,
        radiusX: 1,
        radiusY: 1,
        force: 1,
      });
    const start = touch(clientY);
    element.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [start],
        changedTouches: [start],
      }),
    );
    const moved = touch(clientY + movement);
    window.dispatchEvent(
      new TouchEvent("touchmove", {
        bubbles: true,
        cancelable: true,
        touches: [moved],
        changedTouches: [moved],
      }),
    );
    window.dispatchEvent(
      new TouchEvent("touchend", {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [moved],
      }),
    );
  }, deltaY);
}

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

test("mobile tap edits a closed activity and persists after reload", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: storeKey, state: stateForToday() },
  );
  await page.reload();

  await page.locator('[data-activity-id="1"]').tap();
  const editor = page.getByRole("dialog", { name: "Edit activity tags" });
  await expect(editor).toBeVisible();
  const choices = editor.locator(".tag-choices");
  await choices.getByRole("button", { name: "Focus", exact: true }).tap();
  await choices.getByRole("button", { name: "Meeting", exact: true }).tap();
  await editor.getByRole("button", { name: "Save", exact: true }).tap();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-activity-id="1"]')).toHaveText("Meeting");

  await page.reload();
  await expect(page.locator('[data-activity-id="1"]')).toHaveText("Meeting");
  expect(
    await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key)!);
      return state.activities[0].tagIds;
    }, storeKey),
  ).toEqual(["meeting"]);
  await context.close();
});

test("two-click creation handles exact times, gaps, dragging, and takeover", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const state = stateForToday();
  state.activities = [];
  state.nextId = 1;
  await page.goto("/");
  await page.evaluate(
    ({ key, persisted }) =>
      localStorage.setItem(key, JSON.stringify(persisted)),
    { key: storeKey, persisted: state },
  );
  await page.reload();
  await page.locator(".capture-panel .tag-toggle").nth(0).tap();
  const axis = page.locator(".time-axis-area");

  // Pick 05:00 first and 03:00 second: future time is allowed.
  await axis.tap({ position: { x: 20, y: 300 } });
  await expect(page.locator(".creation-boundary")).toBeVisible();
  await expect(page.locator(".timeline-help")).toContainText(
    "Boundary at 05:00",
  );
  await axis.tap({ position: { x: 20, y: 180 } });

  // Pick 02:00, then claim the unfilled side through 03:00.
  await axis.tap({ position: { x: 20, y: 120 } });
  await page
    .locator(".timeline-gap")
    .first()
    .tap({
      position: { x: 100, y: 150 },
    });

  // The broad 02:00 activity surface moves the same shared boundary to 02:45.
  const twoAmActivity = page.locator('[data-activity-id="2"]');
  await twoAmActivity.scrollIntoViewIfNeeded();
  await dragByTouch(twoAmActivity, -15);

  // Select Meeting, split at 04:00, and claim the activity side above it.
  const choices = page.locator(".capture-panel .tag-toggle");
  await choices.nth(0).tap();
  await choices.nth(1).tap();
  await axis.tap({ position: { x: 20, y: 240 } });
  await page.locator('[data-activity-id="1"]').tap({
    position: { x: 100, y: 45 },
  });

  const expectedIntervals = [
    { tagIds: ["focus"], start: 120, duration: 45 },
    { tagIds: ["meeting"], start: 165, duration: 75 },
    { tagIds: ["focus"], start: 240, duration: 60 },
  ];
  const readIntervals = () =>
    page.evaluate((key) => {
      const persisted = JSON.parse(localStorage.getItem(key)!);
      return persisted.activities.map(
        (activity: {
          tagIds: string[];
          start_time_minutes: number;
          duration_minutes: number;
        }) => ({
          tagIds: activity.tagIds,
          start: activity.start_time_minutes,
          duration: activity.duration_minutes,
        }),
      );
    }, storeKey);
  await expect.poll(readIntervals).toEqual(expectedIntervals);

  await page.reload();
  await expect.poll(readIntervals).toEqual(expectedIntervals);
  await expect(page.locator(".activity-item")).toHaveText([
    "Focus",
    "Meeting",
    "Focus",
  ]);
  await context.close();
});

test("unfilled slots can be dragged, deleted, or assigned tags", async ({
  page,
}) => {
  const state = stateForToday();
  state.activities[0].duration_minutes = 30;
  state.activities.push({
    id: 3,
    tagIds: ["focus"],
    start_time_minutes: 240,
    duration_minutes: 60,
    date: state.activities[0].date,
  });
  state.nextId = 4;
  await page.goto("/");
  await page.evaluate(
    ({ key, persisted }) =>
      localStorage.setItem(key, JSON.stringify(persisted)),
    { key: storeKey, persisted: state },
  );
  await page.reload();

  await expect(page.locator(".activity-border")).toHaveCount(0);
  const internalGap = page.locator(".timeline-gap").nth(1);
  await internalGap.scrollIntoViewIfNeeded();
  const box = await internalGap.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 15);
  await page.mouse.up();

  await page.locator(".timeline-gap").nth(1).click();
  let editor = page.getByRole("dialog", { name: "Fill unfilled time" });
  await expect(editor).toContainText("01:30–02:15");
  await editor.getByRole("button", { name: "Delete unfilled time" }).click();
  await expect(page.locator('[data-activity-id="1"]')).toHaveCSS(
    "height",
    "30px",
  );
  await editor
    .getByRole("button", { name: "Confirm delete unfilled time" })
    .click();

  await page.locator(".timeline-gap").nth(1).click();
  editor = page.getByRole("dialog", { name: "Fill unfilled time" });
  await expect(editor).toContainText("03:00–04:00");
  const tagChoices = editor.locator(".tag-choices");
  await tagChoices.getByRole("button", { name: "Focus", exact: true }).click();
  await tagChoices
    .getByRole("button", { name: "Meeting", exact: true })
    .click();
  await editor.getByRole("button", { name: "Save" }).click();

  const readIntervals = () =>
    page.evaluate((key) => {
      const persisted = JSON.parse(localStorage.getItem(key)!);
      return persisted.activities.map(
        (activity: {
          tagIds: string[];
          start_time_minutes: number;
          duration_minutes: number;
        }) => [
          activity.tagIds,
          activity.start_time_minutes,
          activity.duration_minutes,
        ],
      );
    }, storeKey);
  const expected = [
    [["focus"], 60, 75],
    [["meeting"], 135, 45],
    [["meeting"], 180, 60],
    [["focus"], 240, 60],
  ];
  await expect.poll(readIntervals).toEqual(expected);
  await page.reload();
  await expect.poll(readIntervals).toEqual(expected);
});

test("mobile deletion requires confirmation and persists after reload", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: storeKey, state: stateForToday() },
  );
  await page.reload();

  await page.locator('[data-activity-id="1"]').tap();
  const editor = page.getByRole("dialog", { name: "Edit activity tags" });
  await editor.getByRole("button", { name: "Delete activity" }).tap();
  await expect(page.locator('[data-activity-id="1"]')).toBeVisible();
  await editor.getByRole("button", { name: "Confirm delete activity" }).tap();
  await expect(page.locator('[data-activity-id="1"]')).toHaveCount(0);
  await expect(page.locator(".today-receipt")).not.toContainText("Focus");

  await page.reload();
  await expect(page.locator('[data-activity-id="1"]')).toHaveCount(0);
  expect(
    await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key)!);
      return state.activities.map((activity: { id: number }) => activity.id);
    }, storeKey),
  ).toEqual([2]);
  await context.close();
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
  await expect(page.getByLabel("Group name", { exact: true })).toHaveCount(0);
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

test("dragging the broad activity surface moves the same local boundary", async ({
  page,
}) => {
  const state = stateForToday();
  state.activities.push({
    id: 3,
    tagIds: ["focus"],
    start_time_minutes: 180,
    duration_minutes: 60,
    date: state.activities[0].date,
  });
  state.nextId = 4;
  await page.goto("/");
  await page.evaluate(
    ({ key, persisted }) =>
      localStorage.setItem(key, JSON.stringify(persisted)),
    { key: storeKey, persisted: state },
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
      [30, 150],
      [60, 180],
    ]);
});
