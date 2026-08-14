import { describe, expect, it } from "vitest";
import {
  getLocalDayAtMs,
  getLocalMinuteOfDay,
  getNextLocalMidnightMs,
} from "@/function/localCalendar";

describe("local calendar helpers", () => {
  it("uses local calendar fields for day and minute", () => {
    const date = new Date(2024, 6, 3, 14, 25, 30, 0);

    expect(getLocalDayAtMs(date.getTime())).toBe("2024-07-03");
    expect(getLocalMinuteOfDay(date)).toBe(14 * 60 + 25.5);
  });

  it("constructs the next midnight by local calendar date", () => {
    const date = new Date(2024, 2, 9, 23, 45);
    const expected = new Date(2024, 2, 10, 0, 0, 0, 0);

    expect(getNextLocalMidnightMs(date.getTime())).toBe(expected.getTime());
    expect(new Date(getNextLocalMidnightMs(date.getTime())).getHours()).toBe(0);
  });

  it("constructs midnight correctly across a DST calendar change", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      const noonBeforeSpringForward = new Date(2024, 2, 9, 12);
      const nextMidnight = getNextLocalMidnightMs(
        noonBeforeSpringForward.getTime(),
      );
      const followingMidnight = getNextLocalMidnightMs(nextMidnight);

      expect(new Date(nextMidnight).getHours()).toBe(0);
      expect(new Date(followingMidnight).getHours()).toBe(0);
      expect(followingMidnight - nextMidnight).toBe(23 * 60 * 60_000);
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it("advances across month and year boundaries", () => {
    const date = new Date(2024, 11, 31, 12);
    const midnight = new Date(getNextLocalMidnightMs(date.getTime()));

    expect(midnight.getFullYear()).toBe(2025);
    expect(midnight.getMonth()).toBe(0);
    expect(midnight.getDate()).toBe(1);
    expect(midnight.getHours()).toBe(0);
  });
});
