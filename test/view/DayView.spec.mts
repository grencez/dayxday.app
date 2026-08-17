import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DayView from "@/view/DayView.vue";
import { getLocalDateString } from "@/function/getLocalDateString";
import { useActivityStore } from "@/store/activity";

const day = getLocalDateString();

function mockAxis(wrapper: VueWrapper, top = 0) {
  const axis = wrapper.get(".time-axis-area");
  vi.spyOn(axis.element, "getBoundingClientRect").mockReturnValue({
    top,
    height: 1440,
  } as DOMRect);
  return axis;
}

describe("DayView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useActivityStore();
    store.tagGroups = [
      {
        id: "work",
        tags: [
          { id: "focus", name: "Focus" },
          { id: "meeting", name: "Meeting" },
        ],
      },
    ];
    store.initializeActivities([
      {
        id: 1,
        tagIds: ["focus"],
        start_time_minutes: 60,
        duration_minutes: 60,
        date: day,
      },
      {
        id: 2,
        tagIds: ["meeting"],
        start_time_minutes: 120,
        duration_minutes: 60,
        date: day,
      },
    ]);
  });
  afterEach(() => vi.useRealTimers());

  it("renders activities and explicit unfilled timeline slots", () => {
    const wrapper = mount(DayView);
    expect(wrapper.findAll(".time-axis-mark")).toHaveLength(25);
    expect(
      wrapper.findAll(".activity-item").map((item) => item.text()),
    ).toEqual(["Focus", "Meeting"]);
    expect(
      wrapper
        .findAll(".timeline-gap")
        .map((gap) => [gap.attributes("style"), gap.text()]),
    ).toEqual([
      ["top: 0px; height: 60px;", "Unfilled"],
      ["top: 180px; height: 1260px;", "Unfilled"],
    ]);
    expect(wrapper.get(".timeline-help").text()).toContain(
      "Tap the time margin to choose a boundary",
    );
    expect(wrapper.findAll(".timeline-gap")[0].attributes("disabled")).toBe(
      undefined,
    );
    expect(wrapper.find(".activity-border").exists()).toBe(false);
  });

  it("fills an unfilled slot by editing its tags", async () => {
    const store = useActivityStore();
    store.updateActivity(2, {
      start_time_minutes: 180,
      duration_minutes: 60,
    });
    const wrapper = mount(DayView, { attachTo: document.body });
    const internalGap = wrapper
      .findAll(".timeline-gap")
      .find((gap) => gap.attributes("style")?.includes("top: 120px"))!;

    await internalGap.trigger("click");
    expect(wrapper.get('[role="dialog"]').text()).toContain(
      "Fill unfilled time",
    );
    const editor = wrapper.get('[role="dialog"]');
    const toggles = editor.findAll(".tag-toggle");
    await toggles
      .find((button) => button.text() === "Meeting")!
      .trigger("click");
    await toggles.find((button) => button.text() === "Focus")!.trigger("click");
    await wrapper.get(".activity-editor-save").trigger("click");

    expect(store.getActivitiesForDay(day)).toMatchObject([
      { tagIds: ["focus"], start_time_minutes: 60, duration_minutes: 60 },
      { tagIds: ["focus"], start_time_minutes: 120, duration_minutes: 60 },
      { tagIds: ["meeting"], start_time_minutes: 180, duration_minutes: 60 },
    ]);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(wrapper.get("h1").element);
    wrapper.unmount();
  });

  it("opens the editor only when no creation boundary is pending", async () => {
    const wrapper = mount(DayView, { attachTo: document.body });
    await wrapper.vm.$nextTick();
    const activity = wrapper.get('[data-activity-id="1"]');
    await activity.trigger("mousedown", { clientX: 100, clientY: 90 });
    window.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 100, clientY: 90 }),
    );
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[role="dialog"]').text()).toContain(
      "Edit activity tags",
    );
    wrapper.unmount();
  });

  it("removes a confirmed activity and restores safe focus", async () => {
    const store = useActivityStore();
    const wrapper = mount(DayView, { attachTo: document.body });
    await wrapper.get('[data-activity-id="1"]').trigger("keydown.enter");
    await wrapper.get(".activity-editor-delete-button").trigger("click");
    await wrapper.get(".activity-editor-confirm-delete").trigger("click");

    expect(store.activities.map(({ id }) => id)).toEqual([2]);
    expect(wrapper.find('[data-activity-id="1"]').exists()).toBe(false);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(wrapper.get("h1").element);
    wrapper.unmount();
  });

  it("creates an exact future interval from two margin clicks in either order", async () => {
    const store = useActivityStore();
    store.initializeActivities([]);
    const wrapper = mount(DayView);
    const axis = mockAxis(wrapper);
    await wrapper.findAll(".tag-toggle")[0].trigger("click");

    await axis.trigger("click", { clientY: 300 });
    expect(wrapper.get(".timeline-help").text()).toContain("Boundary at 05:00");
    expect(wrapper.get(".creation-boundary").attributes("style")).toContain(
      "top: 300px",
    );
    await axis.trigger("click", { clientY: 180 });

    expect(store.getActivitiesForDay(day)).toMatchObject([
      {
        tagIds: ["focus"],
        start_time_minutes: 180,
        duration_minutes: 120,
      },
    ]);
    expect(wrapper.find(".creation-boundary").exists()).toBe(false);

    store.clearActivitiesForDay(day);
    await wrapper.vm.$nextTick();
    await axis.trigger("click", { clientY: 180 });
    await axis.trigger("click", { clientY: 300 });
    expect(store.getActivitiesForDay(day)).toMatchObject([
      {
        tagIds: ["focus"],
        start_time_minutes: 180,
        duration_minutes: 120,
      },
    ]);
  });

  it("claims the clicked side of an unfilled slot", async () => {
    const store = useActivityStore();
    store.initializeActivities([
      {
        id: 1,
        tagIds: ["focus"],
        start_time_minutes: 180,
        duration_minutes: 120,
        date: day,
      },
    ]);
    const wrapper = mount(DayView);
    const axis = mockAxis(wrapper);

    await axis.trigger("click", { clientY: 120 });
    const upperGap = wrapper.findAll(".timeline-gap")[0];
    await upperGap.trigger("click", { clientY: 150 });

    expect(store.getActivitiesForDay(day)).toMatchObject([
      {
        tagIds: ["focus"],
        start_time_minutes: 120,
        duration_minutes: 60,
      },
      {
        tagIds: ["focus"],
        start_time_minutes: 180,
        duration_minutes: 120,
      },
    ]);
  });

  it("claims the clicked side of a filled activity and preserves its other side", async () => {
    const store = useActivityStore();
    store.initializeActivities([
      {
        id: 1,
        tagIds: ["focus"],
        start_time_minutes: 165,
        duration_minutes: 135,
        date: day,
      },
    ]);
    const wrapper = mount(DayView, { attachTo: document.body });
    const axis = mockAxis(wrapper);
    const toggles = wrapper.findAll(".tag-toggle");
    await toggles[0].trigger("click");
    await toggles[1].trigger("click");
    await axis.trigger("click", { clientY: 240 });

    const activity = wrapper.get('[data-activity-id="1"]');
    await activity.trigger("mousedown", { clientX: 100, clientY: 210 });
    window.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 100, clientY: 210 }),
    );
    await wrapper.vm.$nextTick();

    expect(store.getActivitiesForDay(day)).toMatchObject([
      {
        tagIds: ["meeting"],
        start_time_minutes: 165,
        duration_minutes: 75,
      },
      {
        tagIds: ["focus"],
        start_time_minutes: 240,
        duration_minutes: 60,
      },
    ]);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("keeps pending creation visible until Cancel or Escape", async () => {
    const wrapper = mount(DayView);
    const axis = mockAxis(wrapper);
    await axis.trigger("click", { clientY: 240 });
    expect(wrapper.find(".creation-boundary").exists()).toBe(true);
    await wrapper.get(".cancel-creation").trigger("click");
    expect(wrapper.find(".creation-boundary").exists()).toBe(false);

    await axis.trigger("click", { clientY: 240 });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".creation-boundary").exists()).toBe(false);
  });

  it("can choose the first boundary before selecting tags", async () => {
    const store = useActivityStore();
    store.initializeActivities([]);
    const wrapper = mount(DayView);
    const axis = mockAxis(wrapper);

    await axis.trigger("click", { clientY: 180 });
    expect(wrapper.get(".timeline-help").text()).toContain("Select tags above");
    await wrapper.findAll(".tag-toggle")[0].trigger("click");
    await axis.trigger("click", { clientY: 300 });

    expect(store.getActivitiesForDay(day)).toMatchObject([
      {
        tagIds: ["focus"],
        start_time_minutes: 180,
        duration_minutes: 120,
      },
    ]);
  });

  it("rolls its local day at midnight, reconciles, and cleans up its timer", async () => {
    vi.useFakeTimers();
    const beforeMidnight = new Date(2024, 4, 10, 23, 59, 59, 500);
    vi.setSystemTime(beforeMidnight);
    const store = useActivityStore();
    store.initializeActivities([]);
    store.runningActivity = {
      tagIds: ["focus"],
      startedAtMs: beforeMidnight.getTime() - 60_000,
    };
    const wrapper = mount(DayView);
    expect(wrapper.vm.currentDate).toBe("2024-05-10");
    await wrapper.get(".timeline-gap").trigger("click");
    expect(wrapper.vm.editingGap.date).toBe("2024-05-10");
    await vi.advanceTimersByTimeAsync(1000);
    expect(wrapper.vm.currentDate).toBe("2024-05-11");
    expect(wrapper.vm.editingGap.date).toBe("2024-05-10");
    expect(store.runningActivity).toBeNull();
    expect(store.activities[0].tagIds).toEqual(["focus"]);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
