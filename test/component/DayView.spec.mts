import { mount } from "@vue/test-utils";
import DayView from "@/asset/component/DayView.vue";
import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";
import { useActivityStore } from "../../src/asset/store/activityStore";
import { Activity } from "../../src/asset/model/Activity";

describe("DayView.vue", () => {
  beforeEach(async () => {
    // Mock indexedDB
    global.indexedDB = new IDBFactory();
    // Create a new Pinia instance before each test
    setActivePinia(createPinia());
    const activityStore = useActivityStore();
    const activities = [
      new Activity(1, "Activity 1", 0, 60),
      new Activity(2, "Activity 2", 60, 60),
      new Activity(3, "Activity 3", 120, 60),
      new Activity(4, "Activity 4", 180, 60),
      new Activity(5, "Activity 5", 240, 60),
      new Activity(6, "Activity 6", 300, 60),
      new Activity(7, "Activity 7", 360, 60),
      new Activity(8, "Activity 8", 420, 60),
      new Activity(9, "Activity 9", 480, 60),
      new Activity(10, "Activity 10", 540, 60),
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
