import { describe, expect, it, vi } from "vitest";
import { getLocalDateString } from "@/function/getLocalDateString";

describe("getLocalDateString", () => {
  it("formats local calendar fields instead of the UTC ISO date", () => {
    const localDate = new Date(2025, 0, 2, 23, 30);
    vi.spyOn(localDate, "toISOString").mockReturnValue(
      "2025-01-03T07:30:00.000Z",
    );

    expect(getLocalDateString(localDate)).toBe("2025-01-02");
  });

  it("zero-pads month and day", () => {
    expect(getLocalDateString(new Date(2025, 8, 7))).toBe("2025-09-07");
  });
});
