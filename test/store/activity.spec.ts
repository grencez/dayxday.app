import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useActivityStore, type Activity } from "@/store/activity";

const day = "2024-05-10";

function activity(
  id: number,
  tagIds: string[],
  start: number,
  duration = 60,
): Activity {
  return {
    id,
    tagIds,
    start_time_minutes: start,
    duration_minutes: duration,
    date: day,
  };
}

describe("structured activity store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  function configuredStore() {
    const store = useActivityStore();
    store.tagGroups = [
      {
        id: "g1",
        name: "Context",
        exclusive: true,
        tags: [
          { id: "office", name: "Office" },
          { id: "home", name: "Home" },
        ],
      },
      {
        id: "g2",
        name: "Work",
        tags: [
          { id: "focus", name: "Focus" },
          { id: "admin", name: "Admin" },
        ],
      },
    ];
    return store;
  }

  it("starts with no guessed configuration or activity", () => {
    const store = useActivityStore();
    expect(store.tagGroups).toEqual([]);
    expect(store.activities).toEqual([]);
  });

  it("creates groups and enforces globally unique trimmed tag names including archived", () => {
    const store = useActivityStore();
    expect(store.createGroup(" Context ", " Office ")).toBe(true);
    expect(store.addTag(store.tagGroups[0].id, "office")).toBe(false);
    store.archiveTag(store.tagGroups[0].tags[0].id);
    expect(store.createGroup("Other", "OFFICE")).toBe(false);
    expect(store.renameTag(store.tagGroups[0].tags[0].id, "Desk")).toBe(true);
    expect(store.createGroup("Other", "Office")).toBe(true);
    expect(
      new Set(
        store.tagGroups.flatMap((group) => group.tags.map((tag) => tag.id)),
      ).size,
    ).toBe(2);
  });

  it("renames and reorders configuration without rewriting activity selections", () => {
    const store = configuredStore();
    store.initializeActivities([activity(1, ["focus", "home"], 60)]);
    store.moveGroup("g2", -1);
    store.moveTag("g1", "home", -1);
    store.renameTag("focus", "Deep work");
    expect(store.activities[0].tagIds).toEqual(["focus", "home"]);
    expect(store.titleForSelection(store.activities[0].tagIds)).toBe(
      "Deep work · Home",
    );
  });

  it("archives tags out of active configuration while preserving and restoring history", () => {
    const store = configuredStore();
    store.initializeActivities([activity(1, ["office", "focus"], 60)]);
    store.archiveTag("focus");
    expect(store.activeTagGroups[1].tags.map((tag) => tag.id)).toEqual([
      "admin",
    ]);
    expect(store.titleForSelection(store.activities[0].tagIds)).toBe(
      "Office · Focus",
    );
    expect(store.recentTagSelections).toEqual([]);
    expect(store.restoreTag("focus")).toBe(true);
    expect(store.recentTagSelections).toEqual([["office", "focus"]]);
  });

  it("keeps combination identity stable when groups reorder", () => {
    const store = configuredStore();
    store.initializeActivities([
      activity(1, ["home", "focus"], 20),
      activity(2, ["focus", "home"], 40),
    ]);
    expect(store.recentTagSelections).toEqual([["home", "focus"]]);
    store.moveGroup("g2", -1);
    expect(store.recentTagSelections).toEqual([["focus", "home"]]);
  });

  it("inserts only nonempty known selections and preserves timeline timing behavior", () => {
    const store = configuredStore();
    store.initializeActivities([activity(1, ["office"], 0, 120)]);
    store.insertActivityAtTime(60, day, { tagIds: [] }, 300);
    expect(store.activities).toHaveLength(1);
    store.insertActivityAtTime(60, day, { tagIds: ["focus"] }, 300);
    expect(store.getActivitiesForDay(day)).toMatchObject([
      { tagIds: ["office"], start_time_minutes: 0, duration_minutes: 60 },
      { tagIds: ["focus"], start_time_minutes: 60, duration_minutes: 240 },
    ]);
  });

  it("updates timing and replaces one day without changing another day", () => {
    const store = configuredStore();
    const other = { ...activity(7, ["admin"], 20), date: "2024-05-11" };
    store.initializeActivities([activity(1, ["office"], 0), other]);
    store.updateActivity(1, { duration_minutes: 30 });
    store.replaceActivitiesForDay(day, [
      { tagIds: ["focus"], start_time_minutes: 90, duration_minutes: 20 },
    ]);
    expect(store.getActivitiesForDay(day)[0]).toMatchObject({
      tagIds: ["focus"],
      start_time_minutes: 90,
    });
    expect(store.getActivitiesForDay("2024-05-11")).toEqual([other]);
  });

  it("moves active tags across archived tags without moving the archive boundary", () => {
    const store = configuredStore();
    store.tagGroups[1].tags.splice(1, 0, {
      id: "old",
      name: "Old work",
      archived: true,
    });
    store.initializeActivities([activity(1, ["old"], 60)]);

    store.moveTag("g2", "admin", -1);

    expect(
      store.tagGroups[1].tags
        .filter((tag) => tag.archived !== true)
        .map((tag) => tag.id),
    ).toEqual(["admin", "focus"]);
    expect(store.tagGroups[1].tags[1]).toMatchObject({
      id: "old",
      archived: true,
    });
    expect(store.titleForSelection(store.activities[0].tagIds)).toBe(
      "Old work",
    );
  });

  it("finds day-scoped activities at boundaries and after a time", () => {
    const store = configuredStore();
    store.initializeActivities([
      activity(1, ["office"], 0, 60),
      activity(2, ["focus"], 60, 60),
      { ...activity(3, ["admin"], 0, 60), date: "2024-05-11" },
    ]);

    expect(store.findActivityAtTime(59.9, day)?.id).toBe(1);
    expect(store.findActivityAtTime(60, day)?.id).toBe(2);
    expect(store.findActivityAtTime(120, day)).toBeNull();
    expect(store.findActivitiesAfterTime(30, day).map(({ id }) => id)).toEqual([
      2,
    ]);
  });

  it("clears one day and removes one activity without touching other records", () => {
    const store = configuredStore();
    const other = { ...activity(3, ["admin"], 0), date: "2024-05-11" };
    store.initializeActivities([
      activity(1, ["office"], 0),
      activity(2, ["focus"], 60),
      other,
    ]);

    store.removeActivity(1);
    expect(store.getActivitiesForDay(day).map(({ id }) => id)).toEqual([2]);
    store.clearActivitiesForDay(day);
    expect(store.getActivitiesForDay(day)).toEqual([]);
    expect(store.getActivitiesForDay("2024-05-11")).toEqual([other]);
  });

  it("allocates collision-safe IDs when replacing a day", () => {
    const store = configuredStore();
    const other = { ...activity(1, ["admin"], 0), date: "2024-05-11" };
    store.initializeActivities([other]);
    store.nextId = 1;

    store.replaceActivitiesForDay(day, [
      { tagIds: ["office"], start_time_minutes: 0, duration_minutes: 60 },
      { tagIds: ["focus"], start_time_minutes: 60, duration_minutes: 60 },
    ]);

    expect(store.activities.map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(new Set(store.activities.map(({ id }) => id)).size).toBe(3);
    expect(store.nextId).toBe(4);
  });

  it("preserves manual insertion timing inside and at the start of activities", () => {
    const store = configuredStore();
    store.initializeActivities([
      activity(1, ["office"], 0, 120),
      activity(2, ["admin"], 120, 60),
    ]);

    store.insertActivityAtTime(60, day, { tagIds: ["focus"] }, 1440);
    expect(store.getActivitiesForDay(day)).toMatchObject([
      { id: 1, start_time_minutes: 0, duration_minutes: 60 },
      { tagIds: ["focus"], start_time_minutes: 60, duration_minutes: 60 },
      { id: 2, start_time_minutes: 120, duration_minutes: 60 },
    ]);

    store.insertActivityAtTime(120, day, { tagIds: ["home"] }, 200);
    expect(store.getActivitiesForDay(day)).toMatchObject([
      { id: 1, start_time_minutes: 0, duration_minutes: 60 },
      { tagIds: ["focus"], start_time_minutes: 60, duration_minutes: 60 },
      { tagIds: ["home"], start_time_minutes: 120, duration_minutes: 80 },
    ]);
  });

  it("inserts before schedules, honors the end limit, and rejects invalid ranges", () => {
    const store = configuredStore();
    store.initializeActivities([activity(9, ["admin"], 700, 300)]);

    store.insertActivityAtTime(500, day, { tagIds: ["focus"] }, 540);
    store.insertActivityAtTime(1440, day, { tagIds: ["focus"] }, 1440);
    store.insertActivityAtTime(601, day, { tagIds: ["focus"] }, 600);
    store.insertActivityAtTime(300, day, { tagIds: ["unknown"] }, 400);

    expect(store.getActivitiesForDay(day)).toMatchObject([
      {
        tagIds: ["focus"],
        start_time_minutes: 500,
        duration_minutes: 40,
      },
      { id: 9, start_time_minutes: 700, duration_minutes: 300 },
    ]);
  });
});
