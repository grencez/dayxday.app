import { describe, it, expect } from "vitest";
import { calculateSnappedY } from "../../src/function/calculateSnappedY";

describe("calculateSnappedY", () => {
  const timeMarkersRect: DOMRect = {
    top: 100,
    bottom: 1540,
    left: 0,
    right: 100,
    height: 1440,
    width: 100,
    x: 0,
    y: 100,
    toJSON: () => {},
  };

  it("should snap to the nearest 30 minutes", () => {
    // 12:20 (12 * 60 + 20 = 740) -> snaps to 12:30 (750)
    // 740 / 30 = 24.66 -> 25 * 30 = 750
    const clientY1 = 100 + 12 * 60 + 20;
    expect(calculateSnappedY(clientY1, timeMarkersRect)).toBe(
      100 + 12 * 60 + 30,
    );

    // 12:40 (12 * 60 + 40 = 760) -> snaps to 12:30 (750)
    // 760 / 30 = 25.33 -> 25 * 30 = 750
    const clientY2 = 100 + 12 * 60 + 40;
    expect(calculateSnappedY(clientY2, timeMarkersRect)).toBe(
      100 + 12 * 60 + 30,
    );

    // 12:50 (12 * 60 + 50 = 770) -> snaps to 13:00 (780)
    // 770 / 30 = 25.66 -> 26 * 30 = 780
    const clientY3 = 100 + 12 * 60 + 50;
    expect(calculateSnappedY(clientY3, timeMarkersRect)).toBe(100 + 13 * 60);
  });

  it("should snap correctly when clientY is exactly on a 30 min mark", () => {
    const clientY = 100 + 10 * 60 + 30;
    expect(calculateSnappedY(clientY, timeMarkersRect)).toBe(
      100 + 10 * 60 + 30,
    );
  });

  it("should handle the top offset of the time markers area", () => {
    const customRect: DOMRect = { ...timeMarkersRect, top: 200 };
    // 5 * 60 + 10 = 310. Snap to 300 (5:00)
    // 310 / 30 = 10.33 -> 10 * 30 = 300
    const clientY = 200 + 5 * 60 + 10;
    expect(calculateSnappedY(clientY, customRect)).toBe(200 + 5 * 60);
  });

  it("should snap to the start (00:00)", () => {
    const clientY = 100 + 10; // 10 minutes past 00:00 -> snaps to 0
    expect(calculateSnappedY(clientY, timeMarkersRect)).toBe(100);
  });
});
