import { describe, expect, it } from "vitest";
import {
  buildTodayReceipt,
  formatReceiptClock,
  formatReceiptDuration,
} from "@/function/buildTodayReceipt";
import type { TagGroup } from "@/function/tagSelection";
import type { Activity } from "@/store/activity";

const day = "2024-05-10";
const tagGroups: TagGroup[] = [
  {
    id: "place",
    name: "Place",
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
      { id: "old", name: "Old work", archived: true },
    ],
  },
];
const at = (hour: number, minute = 0) =>
  new Date(2024, 4, 10, hour, minute).getTime();
const activity = (
  id: number,
  tagIds: string[],
  start_time_minutes: number,
  duration_minutes: number,
): Activity => ({
  id,
  tagIds,
  start_time_minutes,
  duration_minutes,
  date: day,
});

describe("buildTodayReceipt", () => {
  it("shows canonical segment titles and per-tag totals grouped in config order", () => {
    const receipt = buildTodayReceipt({
      day,
      nowMs: at(12),
      tagGroups,
      runningActivity: null,
      activities: [
        activity(2, ["focus", "office"], 10 * 60, 60),
        activity(1, ["home", "focus"], 9 * 60, 60),
      ],
    });
    expect(receipt.segments.map((segment) => segment.title)).toEqual([
      "Home · Focus",
      "Office · Focus",
    ]);
    expect(receipt.groupedTotals).toEqual([
      {
        id: "place",
        name: "Place",
        tags: [
          { id: "office", name: "Office", minutes: 60 },
          { id: "home", name: "Home", minutes: 60 },
        ],
      },
      {
        id: "work",
        name: "Work",
        tags: [{ id: "focus", name: "Focus", minutes: 120 }],
      },
    ]);
  });

  it("includes archived tags used by history and the running segment", () => {
    const receipt = buildTodayReceipt({
      day,
      nowMs: at(11),
      tagGroups,
      activities: [activity(1, ["old"], 9 * 60, 30)],
      runningActivity: { tagIds: ["office", "focus"], startedAtMs: at(10, 30) },
    });
    expect(receipt.segments[0].title).toBe("Old work");
    expect(receipt.segments[1]).toMatchObject({
      title: "Office · Focus",
      durationMinutes: 30,
      ongoing: true,
    });
    expect(receipt.groupedTotals[1].tags).toEqual([
      { id: "focus", name: "Focus", minutes: 30 },
      { id: "old", name: "Old work", minutes: 30 },
    ]);
  });

  it("unions overlaps per tag while allowing totals for different tags to overlap", () => {
    const receipt = buildTodayReceipt({
      day,
      nowMs: at(5),
      tagGroups,
      runningActivity: null,
      activities: [
        activity(1, ["office", "focus"], 60, 120),
        activity(2, ["home", "focus"], 120, 120),
      ],
    });
    expect(receipt.trackedMinutes).toBe(180);
    expect(receipt.untrackedMinutes).toBe(120);
    expect(receipt.groupedTotals[0].tags).toEqual([
      { id: "office", name: "Office", minutes: 120 },
      { id: "home", name: "Home", minutes: 120 },
    ]);
    expect(receipt.groupedTotals[1].tags[0]).toEqual({
      id: "focus",
      name: "Focus",
      minutes: 180,
    });
  });

  it("clips at now and ignores empty, unknown, and invalid timing", () => {
    const receipt = buildTodayReceipt({
      day,
      nowMs: at(8),
      tagGroups,
      runningActivity: null,
      activities: [
        activity(1, ["focus"], 7 * 60 + 30, 60),
        activity(2, [], 60, 30),
        activity(3, ["unknown"], 120, 30),
        activity(4, ["focus"], Number.NaN, 30),
      ],
    });
    expect(receipt.segments).toHaveLength(1);
    expect(receipt.segments[0].durationMinutes).toBe(30);
    expect(receipt.trackedMinutes).toBe(30);
  });
});

describe("receipt formatting", () => {
  it("formats durations and clocks", () => {
    expect(formatReceiptDuration(0.5)).toBe("<1m");
    expect(formatReceiptDuration(65)).toBe("1h 5m");
    expect(formatReceiptClock(at(9, 5))).toBe("09:05");
  });
});
