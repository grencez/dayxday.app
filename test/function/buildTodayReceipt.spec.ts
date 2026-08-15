import { describe, expect, it } from "vitest";
import {
  buildTodayReceipt,
  formatReceiptClock,
  formatReceiptDuration,
} from "@/function/buildTodayReceipt";
import type { Activity } from "@/store/activity";

const day = "2024-05-10";

function at(hour: number, minute = 0): number {
  return new Date(2024, 4, 10, hour, minute).getTime();
}

function activity(
  id: number,
  name: string,
  start_time_minutes: number,
  duration_minutes: number,
): Activity {
  return {
    id,
    name,
    start_time_minutes,
    duration_minutes,
    date: day,
  };
}

describe("buildTodayReceipt", () => {
  it("sorts segments, clips them at now, and aggregates repeated names", () => {
    const receipt = buildTodayReceipt({
      day,
      nowMs: at(12),
      runningActivity: null,
      activities: [
        activity(2, "Break", 10 * 60 + 30, 30),
        activity(3, "Focus", 11 * 60 + 30, 60),
        activity(1, "Focus", 9 * 60, 60),
      ],
    });

    expect(receipt.segments.map((segment) => segment.name)).toEqual([
      "Focus",
      "Break",
      "Focus",
    ]);
    expect(receipt.segments[2].durationMinutes).toBe(30);
    expect(receipt.totals).toEqual([
      { name: "Focus", minutes: 90 },
      { name: "Break", minutes: 30 },
    ]);
    expect(receipt.trackedMinutes).toBe(120);
    expect(receipt.untrackedMinutes).toBe(600);
    expect(receipt.coveragePercent).toBeCloseTo(100 / 6);
  });

  it("counts the current activity only through now without persisting it", () => {
    const runningActivity = {
      name: "Planning",
      startedAtMs: at(10, 15),
    };
    const receipt = buildTodayReceipt({
      day,
      nowMs: at(10, 45),
      runningActivity,
      activities: [],
    });

    expect(receipt.segments).toHaveLength(1);
    expect(receipt.segments[0]).toMatchObject({
      name: "Planning",
      durationMinutes: 30,
      ongoing: true,
    });
    expect(receipt.totals).toEqual([{ name: "Planning", minutes: 30 }]);
    expect(runningActivity).toEqual({
      name: "Planning",
      startedAtMs: at(10, 15),
    });
  });

  it("uses interval union for coverage when activities overlap", () => {
    const receipt = buildTodayReceipt({
      day,
      nowMs: at(5),
      runningActivity: null,
      activities: [
        activity(1, "Focus", 60, 120),
        activity(2, "Meeting", 120, 120),
      ],
    });

    expect(receipt.totals).toEqual([
      { name: "Focus", minutes: 120 },
      { name: "Meeting", minutes: 120 },
    ]);
    expect(receipt.trackedMinutes).toBe(180);
    expect(receipt.untrackedMinutes).toBe(120);
    expect(receipt.coveragePercent).toBe(60);
  });

  it("ignores invalid and future segments", () => {
    const receipt = buildTodayReceipt({
      day,
      nowMs: at(8),
      runningActivity: null,
      activities: [
        activity(1, "Future", 9 * 60, 60),
        activity(2, "Zero", 7 * 60, 0),
        activity(3, "Invalid", Number.NaN, 30),
      ],
    });

    expect(receipt.segments).toEqual([]);
    expect(receipt.trackedMinutes).toBe(0);
    expect(receipt.untrackedMinutes).toBe(480);
  });
});

describe("receipt formatting", () => {
  it("formats durations and local clock times compactly", () => {
    expect(formatReceiptDuration(0)).toBe("0m");
    expect(formatReceiptDuration(0.5)).toBe("<1m");
    expect(formatReceiptDuration(65)).toBe("1h 5m");
    expect(formatReceiptClock(at(9, 5))).toBe("09:05");
  });
});
