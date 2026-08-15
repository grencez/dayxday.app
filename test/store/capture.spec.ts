import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { getNextLocalMidnightMs } from "@/function/localCalendar";
import { useActivityStore, type Activity } from "@/store/activity";

describe("structured one-tap capture store", () => {
  const at = (day: number, hour: number, minute = 0) =>
    new Date(2024, 4, day, hour, minute).getTime();

  beforeEach(() => setActivePinia(createPinia()));

  function storeWithTags() {
    const store = useActivityStore();
    store.tagGroups = [
      {
        id: "place",
        name: "Place",
        exclusive: true,
        tags: [
          { id: "office", name: "Office" },
          { id: "home", name: "Home" },
        ],
      },
      {
        id: "work",
        name: "Work",
        tags: [
          { id: "focus", name: "Focus" },
          { id: "meeting", name: "Meeting" },
          { id: "archived", name: "Old", archived: true },
        ],
      },
    ];
    return store;
  }

  it("rejects empty, unknown, archived, and conflicting capture selections", () => {
    const store = storeWithTags();
    for (const selection of [
      [],
      ["unknown"],
      ["archived"],
      ["office", "home"],
    ]) {
      store.transitionTo(selection, at(10, 9));
    }
    expect(store.runningActivity).toBeNull();
  });

  it("splits and normalizes a running selection when its group becomes exclusive", () => {
    const store = storeWithTags();
    const started = at(10, 9);
    const changed = at(10, 9, 30);
    store.transitionTo(["focus", "meeting"], started);

    store.toggleGroupExclusive("work", changed);

    expect(store.activities).toMatchObject([
      {
        tagIds: ["focus", "meeting"],
        duration_minutes: 30,
      },
    ]);
    expect(store.runningActivity).toEqual({
      tagIds: ["focus"],
      startedAtMs: changed,
    });
    expect(store.canUndoLastTransition).toBe(false);

    store.stop(at(10, 10));
    expect(store.activities[1]).toMatchObject({
      tagIds: ["focus"],
      duration_minutes: 30,
    });
  });

  it("canonicalizes transitions and undoes gap to activity", () => {
    const store = storeWithTags();
    const now = at(10, 9);
    store.transitionTo(["focus", "home"], now);
    expect(store.runningActivity).toEqual({
      tagIds: ["home", "focus"],
      startedAtMs: now,
    });
    store.undoLastTransition(now + 1);
    expect(store.runningActivity).toBeNull();
  });

  it("undoes activity switches with cloned tag arrays", () => {
    const store = storeWithTags();
    const start = at(10, 9);
    const switched = at(10, 9, 30);
    const original = ["office", "focus"];
    store.transitionTo(original, start);
    original.push("meeting");
    store.transitionTo(["meeting"], switched);
    expect(store.activities[0]).toMatchObject({
      tagIds: ["office", "focus"],
      duration_minutes: 30,
    });
    store.undoLastTransition(switched + 1);
    expect(store.activities).toEqual([]);
    expect(store.runningActivity).toEqual({
      tagIds: ["office", "focus"],
      startedAtMs: start,
    });
  });

  it("stops, undoes, and treats reordered identical sets as no-ops", () => {
    const store = storeWithTags();
    const start = at(10, 12);
    store.transitionTo(["office", "focus"], start);
    const undo = store.lastCaptureUndo;
    store.transitionTo(["focus", "office"], start + 60_000);
    expect(store.lastCaptureUndo).toBe(undo);
    store.stop(start + 45 * 60_000);
    expect(store.activities[0].duration_minutes).toBe(45);
    store.undoLastTransition(start + 46 * 60_000);
    expect(store.runningActivity?.startedAtMs).toBe(start);
  });

  it("closes only through local midnight and expires undo", () => {
    const store = storeWithTags();
    const started = at(10, 23, 30);
    const midnight = getNextLocalMidnightMs(started);
    store.transitionTo(["focus"], started);
    store.reconcileRunning(midnight + 60_000);
    expect(store.activities[0]).toMatchObject({
      tagIds: ["focus"],
      start_time_minutes: 1410,
      duration_minutes: 30,
    });
    expect(store.runningActivity).toBeNull();
    expect(store.canUndoLastTransition).toBe(false);
  });

  it("uses the DST-aware interval to local midnight", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      const store = storeWithTags();
      const started = new Date(2024, 2, 10, 0).getTime();
      store.transitionTo(["focus"], started);
      store.reconcileRunning(getNextLocalMidnightMs(started));
      expect(store.activities[0].duration_minutes).toBe(23 * 60);
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it("derives at most six recent distinct active valid combinations", () => {
    const store = storeWithTags();
    const selections = [
      ["office"],
      ["home"],
      ["focus"],
      ["meeting"],
      ["office", "focus"],
      ["home", "meeting"],
      ["office", "meeting"],
      ["meeting", "office"],
      ["archived"],
      ["office", "home"],
    ];
    store.initializeActivities(
      selections.map((tagIds, index): Activity => ({
        id: index + 1,
        tagIds,
        start_time_minutes: index * 10,
        duration_minutes: 10,
        date: "2024-05-10",
      })),
    );
    expect(store.recentTagSelections).toEqual([
      ["office", "meeting"],
      ["home", "meeting"],
      ["office", "focus"],
      ["meeting"],
      ["focus"],
      ["home"],
    ]);
  });

  it("invalidates guarded undo on manual timeline mutation", () => {
    const store = storeWithTags();
    const start = at(10, 9);
    store.transitionTo(["focus"], start);
    store.stop(start + 60_000);
    expect(store.canUndoLastTransition).toBe(true);
    store.updateActivity(store.activities[0].id, { duration_minutes: 2 });
    expect(store.canUndoLastTransition).toBe(false);
  });
});
