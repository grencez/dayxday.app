import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DayView from "@/view/DayView.vue";
import { getLocalDateString } from "@/function/getLocalDateString";
import { useActivityStore } from "@/store/activity";

const day = getLocalDateString();

describe("DayView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useActivityStore();
    store.tagGroups = [
      {
        id: "work",
        name: "Work",
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

  it("renders canonical titles, time markers, and no free-form timeline editing", () => {
    const wrapper = mount(DayView);
    expect(wrapper.text()).toContain("Day View");
    expect(wrapper.findAll(".time-axis-mark")).toHaveLength(25);
    expect(
      wrapper.findAll(".activity-item").map((item) => item.text()),
    ).toEqual(["Focus", "Meeting"]);
    expect(wrapper.find("[contenteditable]").exists()).toBe(false);
  });

  it("does not fabricate an activity when the timeline is clicked", async () => {
    const store = useActivityStore();
    const wrapper = mount(DayView);
    await wrapper.get(".time-axis-area").trigger("click", { clientY: 140 });
    expect(store.activities).toHaveLength(2);
    expect(wrapper.text()).not.toContain("New Activity");
  });

  it("shows structured capture guidance when empty", () => {
    const store = useActivityStore();
    store.clearActivitiesForDay(day);
    const wrapper = mount(DayView);
    expect(wrapper.get(".empty-state").text()).toBe(
      "Select at least one tag above to start tracking.",
    );
  });

  it("explains why a running tagged activity is not yet on an empty timeline", () => {
    const store = useActivityStore();
    store.clearActivitiesForDay(day);
    store.runningActivity = {
      tagIds: ["focus"],
      startedAtMs: Date.now(),
    };
    const wrapper = mount(DayView);

    expect(wrapper.get(".empty-state").text()).toBe(
      "Your current activity will appear here when it ends.",
    );
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
    await vi.advanceTimersByTimeAsync(1000);
    expect(wrapper.vm.currentDate).toBe("2024-05-11");
    expect(store.runningActivity).toBeNull();
    expect(store.activities[0].tagIds).toEqual(["focus"]);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
