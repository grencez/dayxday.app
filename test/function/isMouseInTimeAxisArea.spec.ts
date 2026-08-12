import { describe, it, expect } from "vitest";
import { isMouseInTimeAxisArea } from "../../src/function/isMouseInTimeAxisArea";

describe("isMouseInTimeAxisArea", () => {
  const timeAxisRect: DOMRect = {
    top: 0,
    bottom: 1440,
    left: 0,
    right: 100,
    height: 1440,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => {},
  };

  // MouseEvent tests
  it("should return true for a MouseEvent inside the area", () => {
    const event = new MouseEvent("mousemove", { clientX: 50 });
    expect(isMouseInTimeAxisArea(event, timeAxisRect)).toBe(true);
  });

  it("should return false for a MouseEvent outside the area (left)", () => {
    const event = new MouseEvent("mousemove", { clientX: -10 });
    expect(isMouseInTimeAxisArea(event, timeAxisRect)).toBe(false);
  });

  it("should return false for a MouseEvent outside the area (right)", () => {
    const event = new MouseEvent("mousemove", { clientX: 110 });
    expect(isMouseInTimeAxisArea(event, timeAxisRect)).toBe(false);
  });

  it("should return true for a MouseEvent on the left edge", () => {
    const event = new MouseEvent("mousemove", { clientX: 0 });
    expect(isMouseInTimeAxisArea(event, timeAxisRect)).toBe(true);
  });

  it("should return true for a MouseEvent on the right edge", () => {
    const event = new MouseEvent("mousemove", { clientX: 100 });
    expect(isMouseInTimeAxisArea(event, timeAxisRect)).toBe(true);
  });

  // TouchEvent tests
  it("should return true for a TouchEvent inside the area", () => {
    const touch = { clientX: 50 };
    const event = new TouchEvent("touchmove", {
      touches: [touch as unknown as Touch],
    });
    expect(isMouseInTimeAxisArea(event, timeAxisRect)).toBe(true);
  });

  it("should return false for a TouchEvent outside the area", () => {
    const touch = { clientX: 150 };
    const event = new TouchEvent("touchmove", {
      touches: [touch as unknown as Touch],
    });
    expect(isMouseInTimeAxisArea(event, timeAxisRect)).toBe(false);
  });

  it("should handle TouchEvent with no touches", () => {
    const event = new TouchEvent("touchmove", { touches: [] });
    expect(isMouseInTimeAxisArea(event, timeAxisRect)).toBe(false);
  });
});
