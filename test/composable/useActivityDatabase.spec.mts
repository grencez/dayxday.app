import { useActivityDatabase } from "@/asset/composable/useActivityDatabase";
import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from 'fake-indexeddb';
import { nextTick } from 'vue';
import { Activity } from '../../src/asset/model/Activity';
import { createPinia, setActivePinia } from "pinia";
import { useActivityStore } from "../../src/asset/store/activityStore";

describe("useActivityDatabase", () => {
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

  it("should load activities from the store", async () => {
    const activityStore = useActivityStore();
    await nextTick(); // Wait for activities to be populated
    const activities = activityStore.getActivitiesForDay;
    expect(activities).not.toBeNull();
    expect(activities.length).toBe(10);
  });

  it("should update an activity in the store", async () => {
    const activityStore = useActivityStore();
    await nextTick(); // Wait for activities to be populated

    const initialActivity = activityStore.getActivitiesForDay[0];
    await activityStore.updateActivity(initialActivity.id, {
      name: "Updated Activity",
    });

    const updatedActivities = activityStore.getActivitiesForDay;
    expect(updatedActivities[0].name).toBe("Updated Activity");
  });
});
