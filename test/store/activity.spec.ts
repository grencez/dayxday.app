import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useActivityStore, Activity } from "@/store/activity";
import { describe, beforeEach, it, expect } from "vitest";

describe("activity store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should initialize with no activities", () => {
    const store = useActivityStore();
    expect(store.getActivitiesForDay.length).toBe(0);
  });

  it("should add activities", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Test Activity 1", start_time_minutes: 0, duration_minutes: 60 },
      { id: 2, name: "Test Activity 2", start_time_minutes: 60, duration_minutes: 60 },
    ];
    store.initializeActivities(activities);
    expect(store.getActivitiesForDay.length).toBe(2);
  });

  it("should update an activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Test Activity 1", start_time_minutes: 0, duration_minutes: 60 },
    ];
    store.initializeActivities(activities);
    store.updateActivity(1, { name: "Updated Activity" });
    expect(store.getActivitiesForDay[0].name).toBe("Updated Activity");
  });

  it("should find an activity at a specific time", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Test Activity 1", start_time_minutes: 0, duration_minutes: 60 },
    ];
    store.initializeActivities(activities);
    const activity = store.findActivityAtTime(30);
    expect(activity).not.toBeNull();
    expect(activity?.name).toBe("Test Activity 1");
  });

  it("should not find an activity at a time outside of any activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Test Activity 1", start_time_minutes: 0, duration_minutes: 60 },
    ];
    store.initializeActivities(activities);
    const activity = store.findActivityAtTime(90);
    expect(activity).toBeNull();
  });

  it("should find activities from a specific time", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Test Activity 1", start_time_minutes: 0, duration_minutes: 60 },
      { id: 2, name: "Test Activity 2", start_time_minutes: 60, duration_minutes: 60 },
    ];
    store.initializeActivities(activities);
    const foundActivities = store.findActivitiesFromTime(30);
    expect(foundActivities.length).toBe(2);
    expect(foundActivities[0].name).toBe("Test Activity 1");
  });

  it("should insert an activity at a specific time", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Test Activity 1", start_time_minutes: 0, duration_minutes: 60 },
      { id: 2, name: "Test Activity 2", start_time_minutes: 120, duration_minutes: 60 },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(60, {
      name: "Inserted Activity",
      start_time_minutes: 60,
    });

    const insertedActivity = store.findActivityAtTime(60);
    expect(insertedActivity).not.toBeNull();
    expect(insertedActivity?.name).toBe("Inserted Activity");
    expect(insertedActivity?.duration_minutes).toBe(60);
  });

  it("should remove an existing activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Test Activity 1", start_time_minutes: 0, duration_minutes: 60 },
    ];
    store.initializeActivities(activities);

    store.removeActivity(1);

    const removedActivity = store.findActivityAtTime(30);
    expect(removedActivity).toBeNull();
  });

  it("should adjust the duration of an existing activity if the new activity starts within it", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Test Activity 1", start_time_minutes: 0, duration_minutes: 120 },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(60, {
      name: "Inserted Activity",
      start_time_minutes: 60,
    });

    const existingActivity = store.findActivityAtTime(30);
    expect(existingActivity).not.toBeNull();
    expect(existingActivity?.duration_minutes).toBe(60);
  });

  it("should remove the existing activity if the new activity covers it completely", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      { id: 1, name: "Test Activity 1", start_time_minutes: 60, duration_minutes: 60 },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(60, {
      name: "New Activity",
      start_time_minutes: 60,
    });

    const oldActivity = store.findActivityAtTime(60);
     expect(oldActivity).not.toBeNull();
    
    store.removeActivity(1);
    const removedActivity = store.findActivityAtTime(60);
    expect(removedActivity).toBeNull();
  });
});
