import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDateString } from "@/function/getLocalDateString";
import { getNextLocalMidnightMs } from "@/function/localCalendar";
import { useActivityStore, type Activity } from "@/store/activity";

describe("one-tap capture store", () => {
  const at = (day: number, hour: number, minute = 0) =>
    new Date(2024, 4, day, hour, minute).getTime();

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("undoes gap to activity", () => {
    const store = useActivityStore();
    const now = at(10, 9);

    store.transitionTo("Focus", now);
    expect(store.runningActivity).toEqual({ name: "Focus", startedAtMs: now });

    store.undoLastTransition(now + 1000);
    expect(store.runningActivity).toBeNull();
    expect(store.activities).toEqual([]);
    expect(store.lastCaptureUndo).toBeNull();
  });

  it("undoes activity to activity without changing the original start", () => {
    const store = useActivityStore();
    const start = at(10, 9);
    const switched = at(10, 9, 30);

    store.transitionTo("Focus", start);
    store.transitionTo("Meeting", switched);

    expect(store.activities).toMatchObject([
      { name: "Focus", start_time_minutes: 540, duration_minutes: 30 },
    ]);
    expect(store.runningActivity?.name).toBe("Meeting");

    store.undoLastTransition(switched + 1000);
    expect(store.activities).toEqual([]);
    expect(store.runningActivity).toEqual({
      name: "Focus",
      startedAtMs: start,
    });
  });

  it("undoes activity to stop", () => {
    const store = useActivityStore();
    const start = at(10, 12);
    const stopped = at(10, 12, 45);

    store.transitionTo("Lunch", start);
    store.stop(stopped);
    expect(store.runningActivity).toBeNull();
    expect(store.activities[0].duration_minutes).toBe(45);

    store.undoLastTransition(stopped + 1);
    expect(store.runningActivity).toEqual({
      name: "Lunch",
      startedAtMs: start,
    });
    expect(store.activities).toEqual([]);
  });

  it("does nothing for same-name transitions and no-op stops", () => {
    const store = useActivityStore();
    const start = at(10, 8);

    store.transitionTo("Focus", start);
    const undo = store.lastCaptureUndo;
    store.transitionTo("  Focus  ", start + 60_000);

    expect(store.runningActivity?.startedAtMs).toBe(start);
    expect(store.lastCaptureUndo).toBe(undo);
    expect(store.activities).toEqual([]);

    store.stop(start + 120_000);
    const stoppedUndo = store.lastCaptureUndo;
    store.stop(start + 180_000);
    expect(store.lastCaptureUndo).toBe(stoppedUndo);
    expect(store.activities).toHaveLength(1);
  });

  it("closes only through the next local midnight and never carries running forward", () => {
    const store = useActivityStore();
    const started = at(10, 23, 30);
    const nextMidnight = getNextLocalMidnightMs(started);

    store.transitionTo("Late work", started);
    store.reconcileRunning(nextMidnight + 12 * 60 * 60_000);

    expect(store.runningActivity).toBeNull();
    expect(store.activities).toMatchObject([
      {
        name: "Late work",
        date: getLocalDateString(new Date(started)),
        start_time_minutes: 1410,
        duration_minutes: 30,
      },
    ]);
  });

  it("uses the actual DST-aware interval through local midnight", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      const store = useActivityStore();
      const started = new Date(2024, 2, 10, 0).getTime();
      const nextMidnight = getNextLocalMidnightMs(started);
      store.transitionTo("Spring-forward day", started);

      store.reconcileRunning(nextMidnight);

      expect(store.activities[0].duration_minutes).toBe(23 * 60);
      expect(store.activities[0].date).toBe("2024-03-10");
      expect(store.runningActivity).toBeNull();
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it("expires a stopped transition undo at the next local midnight", () => {
    const store = useActivityStore();
    const started = at(10, 23);
    const stopped = at(10, 23, 30);
    store.transitionTo("Late work", started);
    store.stop(stopped);
    expect(store.canUndoLastTransition).toBe(true);

    store.reconcileRunning(getNextLocalMidnightMs(stopped));

    expect(store.canUndoLastTransition).toBe(false);
    expect(store.runningActivity).toBeNull();
  });

  it("clears a future-invalid running activity without creating history", () => {
    const store = useActivityStore();
    const now = at(10, 10);
    store.runningActivity = { name: "Impossible", startedAtMs: now + 1 };

    store.reconcileRunning(now);

    expect(store.runningActivity).toBeNull();
    expect(store.activities).toEqual([]);
  });

  it("derives six recent unique trimmed names and excludes the current activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      "Old",
      "Alpha",
      "Beta",
      "Gamma",
      "Delta",
      "Epsilon",
      "Zeta",
      " Alpha ",
      " ",
    ].map((name, index) => ({
      id: index + 1,
      name,
      start_time_minutes: index * 10,
      duration_minutes: 10,
      date: "2024-05-10",
    }));
    store.initializeActivities(activities);
    store.runningActivity = {
      name: "Zeta",
      startedAtMs: at(10, 12),
    };

    expect(store.recentActivityNames).toEqual([
      "Alpha",
      "Epsilon",
      "Delta",
      "Gamma",
      "Beta",
      "Old",
    ]);
  });

  it("invalidates capture undo on any manual timeline mutation", () => {
    const store = useActivityStore();
    const start = at(10, 9);
    store.transitionTo("Focus", start);
    store.stop(start + 60_000);
    expect(store.canUndoLastTransition).toBe(true);

    store.updateActivity(store.activities[0].id, { name: "Edited" });

    expect(store.lastCaptureUndo).toBeNull();
    store.undoLastTransition(start + 120_000);
    expect(store.activities[0].name).toBe("Edited");
    expect(store.runningActivity).toBeNull();
  });

  it("refuses undo when the guarded capture result was changed", () => {
    const store = useActivityStore();
    const start = at(10, 9);
    store.transitionTo("Focus", start);
    store.transitionTo("Meeting", start + 60_000);
    store.runningActivity = { name: "Tampered", startedAtMs: start + 60_000 };

    store.undoLastTransition(start + 120_000);

    expect(store.runningActivity?.name).toBe("Tampered");
    expect(store.activities).toHaveLength(1);
    expect(store.lastCaptureUndo).toBeNull();
  });
});
