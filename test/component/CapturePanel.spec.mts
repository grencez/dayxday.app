import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import CapturePanel from "@/component/CapturePanel.vue";
import { useActivityStore } from "@/store/activity";

describe("CapturePanel", () => {
  const nowMs = new Date(2024, 4, 10, 10, 30).getTime();

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("shows current activity with live elapsed and transitions from a recent name", async () => {
    const store = useActivityStore();
    store.initializeActivities([
      {
        id: 1,
        name: "Focus",
        start_time_minutes: 500,
        duration_minutes: 20,
        date: "2024-05-09",
      },
    ]);
    store.runningActivity = {
      name: "Email",
      startedAtMs: nowMs - 90_000,
    };
    const wrapper = mount(CapturePanel, { props: { nowMs } });

    expect(wrapper.find(".capture-current").text()).toContain("Email");
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("Email");
    expect(wrapper.find(".capture-elapsed").text()).toBe("00:01:30");
    expect(wrapper.get(".capture-elapsed").attributes("aria-label")).toBe(
      "Elapsed time",
    );

    await wrapper.get(".recent-activity-button").trigger("click");
    expect(store.runningActivity).toEqual({
      name: "Focus",
      startedAtMs: nowMs,
    });
  });

  it("submits Other with Enter, stops, and conditionally undoes", async () => {
    const store = useActivityStore();
    const wrapper = mount(CapturePanel, { props: { nowMs } });

    expect(wrapper.text()).toContain("Not tracking");
    expect(
      wrapper.findAll("button").some((button) => button.text() === "Undo"),
    ).toBe(false);

    await wrapper.get("#capture-other-name").setValue("  Planning  ");
    await wrapper.get(".capture-other").trigger("submit");
    expect(store.runningActivity).toEqual({
      name: "Planning",
      startedAtMs: nowMs,
    });

    const stop = wrapper
      .findAll("button")
      .find((button) => button.text() === "Stop")!;
    await stop.trigger("click");
    expect(store.runningActivity).toBeNull();
    expect(
      wrapper.findAll("button").some((button) => button.text() === "Undo"),
    ).toBe(true);

    const undo = wrapper
      .findAll("button")
      .find((button) => button.text() === "Undo")!;
    await undo.trigger("click");
    expect(store.runningActivity?.name).toBe("Planning");
    expect(
      wrapper.findAll("button").some((button) => button.text() === "Undo"),
    ).toBe(false);
  });
});
