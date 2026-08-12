import { mount } from "@vue/test-utils";
import DayView from "@/view/DayView.vue";
import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";
import { useActivityStore, Activity } from "@/store/activity";

describe("DayView.vue", () => {
  beforeEach(async () => {
    // Mock indexedDB
    global.indexedDB = new IDBFactory();
    // Create a new Pinia instance before each test
    setActivePinia(createPinia());
    const activityStore = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Activity 1", start_time_minutes: 0, duration_minutes: 60 },
      { id: 2, name: "Activity 2", start_time_minutes: 60, duration_minutes: 60 },
      { id: 3, name: "Activity 3", start_time_minutes: 120, duration_minutes: 60 },
      { id: 4, name: "Activity 4", start_time_minutes: 180, duration_minutes: 60 },
      { id: 5, name: "Activity 5", start_time_minutes: 240, duration_minutes: 60 },
      { id: 6, name: "Activity 6", start_time_minutes: 300, duration_minutes: 60 },
      { id: 7, name: "Activity 7", start_time_minutes: 360, duration_minutes: 60 },
      { id: 8, name: "Activity 8", start_time_minutes: 420, duration_minutes: 60 },
      { id: 9, name: "Activity 9", start_time_minutes: 480, duration_minutes: 60 },
      {
        id: 10,
        name: "Activity 10",
        start_time_minutes: 540,
        duration_minutes: 60,
      },
    ];
    await activityStore.initializeActivities(activities);
  });

  it("renders the Day View heading", () => {
    const wrapper = mount(DayView);
    expect(wrapper.text()).toContain("Day View");
  });

  it("renders the time markers", () => {
    const wrapper = mount(DayView);
    const timeMarkers = wrapper.findAll(".time-marker");
    expect(timeMarkers.length).toBe(25);
  });

  it("renders the activities", async () => {
    const wrapper = mount(DayView);
    await new Promise((resolve) => setTimeout(resolve, 0)); // Wait for onMounted
    const activityItems = wrapper.findAll(".activity-item");
    expect(activityItems.length).toBe(10);
  });
});
