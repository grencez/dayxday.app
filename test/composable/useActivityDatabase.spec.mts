import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useActivityStore, Activity } from "@/store/activity";

describe("useActivityDatabase", () => {
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
