import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { updateActivityElementStyle } from "../../src/function/updateActivityElementStyle";

describe("updateActivityElementStyle", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should update the top style of the element", () => {
    container.innerHTML = `
      <div class="activity-item"></div>
      <div class="activity-item"></div>
    `;
    updateActivityElementStyle(1, { top: 100 });
    const element = container.querySelectorAll(
      ".activity-item",
    )[1] as HTMLElement;
    expect(element.style.top).toBe("100px");
  });

  it("should update the height style of the element", () => {
    container.innerHTML = `<div class="activity-item"></div>`;
    updateActivityElementStyle(0, { height: 200 });
    const element = container.querySelector(".activity-item") as HTMLElement;
    expect(element.style.height).toBe("200px");
  });

  it("should update both top and height styles", () => {
    container.innerHTML = `<div class="activity-item"></div>`;
    updateActivityElementStyle(0, { top: 50, height: 150 });
    const element = container.querySelector(".activity-item") as HTMLElement;
    expect(element.style.top).toBe("50px");
    expect(element.style.height).toBe("150px");
  });

  it("should not throw an error if the element does not exist", () => {
    container.innerHTML = `<div class="activity-item"></div>`;
    // Index 1 is out of bounds
    expect(() => updateActivityElementStyle(1, { top: 100 })).not.toThrow();
  });

  it("should not modify other styles", () => {
    container.innerHTML = `<div class="activity-item" style="color: red;"></div>`;
    updateActivityElementStyle(0, { top: 100 });
    const element = container.querySelector(".activity-item") as HTMLElement;
    expect(element.style.top).toBe("100px");
    expect(element.style.color).toBe("red");
  });
});
