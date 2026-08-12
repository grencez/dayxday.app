import { setActivePinia, createPinia } from "pinia";
import { useActivityStore } from "@/asset/store/activityStore";
import { Activity } from "@/asset/model/Activity";
import { describe, it, expect, beforeEach } from "vitest";

describe("ActivityStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("initializes with empty activities", () => {
    const store = useActivityStore();
    expect(store.activities).toEqual([]);
  });

  it("initializes with provided activities", () => {
    const initialActivities = [
      new Activity(1, "Test Activity 1", 0, 60),
      new Activity(2, "Test Activity 2", 60, 120),
    ];
    const store = useActivityStore();
    store.initializeActivities(initialActivities);
    expect(store.activities).toEqual(initialActivities);
    expect(store.nextId).toBe(3)
  });

  it("gets activities for the day", () => {
    const activities = [
      new Activity(1, "Activity 1", 0, 60),
      new Activity(2, "Activity 2", 60, 60),
      new Activity(3, "Activity 3", 120, 60),
    ];
    const store = useActivityStore();
    store.initializeActivities(activities);
    const activitiesForDay = store.getActivitiesForDay;
    expect(activitiesForDay).toEqual(activities);
  });

  it("updates an activity", () => {
    const initialActivities = [
      new Activity(1, "Test Activity 1", 0, 60),
      new Activity(2, "Test Activity 2", 60, 120),
    ];
    const store = useActivityStore();
    store.initializeActivities(initialActivities);

    store.updateActivity(1, { name: "Updated Activity 1" });
    expect(store.activities[0].name).toBe("Updated Activity 1");

    store.updateActivity(2, { startTime: 70 });
    expect(store.activities[1].startTime).toBe(70);

    store.updateActivity(1, { duration: 90 });
    expect(store.activities[0].duration).toBe(90);
  });

  it("does not update a non-existent activity", () => {
    const initialActivities = [
      new Activity(1, "Test Activity 1", 0, 60),
      new Activity(2, "Test Activity 2", 60, 120),
    ];
    const store = useActivityStore();
    store.initializeActivities(initialActivities);

    store.updateActivity(3, { name: "Updated Activity 3" });
    expect(store.activities.length).toBe(2);
  });

  it("finds the activity at a given time", () => {
    const activities = [
      new Activity(1, "Activity 1", 0, 60),
      new Activity(2, "Activity 2", 60, 120),
      new Activity(3, "Activity 3", 180, 60),
    ];
    const store = useActivityStore();
    store.initializeActivities(activities);

    const activity1 = store.findActivityAtTime(30);
    expect(activity1).toEqual(activities[0]);

    const activity2 = store.findActivityAtTime(150);
    expect(activity2).toEqual(activities[1]);

    const activity3 = store.findActivityAtTime(200);
    expect(activity3).toEqual(activities[2]);

    const noActivity = store.findActivityAtTime(300);
    expect(noActivity).toBeNull();
  });

  it("finds activities starting from a given time", () => {
    const activities = [
      new Activity(1, "Activity 1", 0, 60),
      new Activity(2, "Activity 2", 60, 120),
      new Activity(3, "Activity 3", 180, 60),
    ];
    const store = useActivityStore();
    store.initializeActivities(activities);

    const activitiesFrom0 = store.findActivitiesFromTime(0);
    expect(activitiesFrom0).toEqual(activities);

    const activitiesFrom60 = store.findActivitiesFromTime(60);
    expect(activitiesFrom60).toEqual([activities[1], activities[2]]);

    const activitiesFrom180 = store.findActivitiesFromTime(180);
    expect(activitiesFrom180).toEqual([activities[2]]);

    const activitiesFrom240 = store.findActivitiesFromTime(240);
    expect(activitiesFrom240).toEqual([]);
  });

  it("returns activities in order by start time", () => {
    const activities = [
      new Activity(1, "Activity 1", 120, 60),
      new Activity(2, "Activity 2", 0, 60),
      new Activity(3, "Activity 3", 60, 60),
    ];
    const store = useActivityStore();
    store.initializeActivities(activities);

    const activitiesForDay = store.getActivitiesForDay;
    expect(activitiesForDay).toEqual([
      activities[1], // Start time: 0
      activities[2], // Start time: 60
      activities[0], // Start time: 120
    ]);
  });

  it("inserts a new activity at a given time, removing remainder of existing activity", () => {
    const activities = [
      new Activity(1, "Activity 1", 0, 60),
      new Activity(2, "Activity 2", 60, 120),
    ];
    const store = useActivityStore();
    store.initializeActivities(activities);
  
    store.insertActivityAtTime(30, { name: "New Activity" });
  
    expect(store.activities).toEqual([
      new Activity(1, "Activity 1", 0, 30),
      new Activity(3, "New Activity", 30, 30),
      new Activity(2, "Activity 2", 60, 120),
    ]);
    expect(store.nextId).toBe(4)
  });
  
  it("inserts a new activity at the start time of an existing activity, removing existing activity", () => {
    const activities = [
      new Activity(1, "Activity 1", 0, 60),
      new Activity(2, "Activity 2", 60, 120),
    ];
    const store = useActivityStore();
    store.initializeActivities(activities);
  
    store.insertActivityAtTime(60, { name: "New Activity" });
  
    expect(store.activities).toEqual([
      new Activity(1, "Activity 1", 0, 60),
      new Activity(3, "New Activity", 60, 120),
    ]);
    expect(store.nextId).toBe(4)
  });
});
