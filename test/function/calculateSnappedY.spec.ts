import { describe, expect, it } from "vitest";
import { calculateSnappedY } from "../../src/function/calculateSnappedY";

describe("calculateSnappedY", () => {
  const timeMarginRect: DOMRect = {
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

  it("snaps to the nearest 15-minute boundary", () => {
    expect(calculateSnappedY(100 + 12 * 60 + 7, timeMarginRect)).toBe(
      100 + 12 * 60,
    );
    expect(calculateSnappedY(100 + 12 * 60 + 8, timeMarginRect)).toBe(
      100 + 12 * 60 + 15,
    );
    expect(calculateSnappedY(100 + 12 * 60 + 53, timeMarginRect)).toBe(
      100 + 13 * 60,
    );
  });

  it("keeps positions already on a 15-minute boundary", () => {
    const clientY = 100 + 10 * 60 + 45;
    expect(calculateSnappedY(clientY, timeMarginRect)).toBe(clientY);
  });

  it("calculates boundaries relative to the time margin top", () => {
    const customRect: DOMRect = { ...timeMarginRect, top: 203 };
    expect(calculateSnappedY(203 + 5 * 60 + 10, customRect)).toBe(
      203 + 5 * 60 + 15,
    );
  });

  it("snaps near midnight to the start boundary", () => {
    expect(calculateSnappedY(100 + 7, timeMarginRect)).toBe(100);
  });
});
