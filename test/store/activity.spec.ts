import { createPinia, setActivePinia } from "pinia";
import { useActivityStore, Activity } from "@/store/activity";
import { describe, beforeEach, it, expect } from "vitest";

describe("activity store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const TEST_DATE = "2023-10-27";

  it("should initialize with no activities", () => {
    const store = useActivityStore();
    expect(store.getActivitiesForDay(TEST_DATE).length).toBe(0);
  });

  it("should add activities", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 2,
        name: "Test Activity 2",
        start_time_minutes: 60,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);
    expect(store.getActivitiesForDay(TEST_DATE).length).toBe(2);
  });

  it("should update an activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);
    store.updateActivity(1, { name: "Updated Activity" });
    expect(store.getActivitiesForDay(TEST_DATE)[0].name).toBe(
      "Updated Activity",
    );
  });

  it("should find an activity at a specific time", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);
    const activity = store.findActivityAtTime(30, TEST_DATE);
    expect(activity).not.toBeNull();
    expect(activity?.name).toBe("Test Activity 1");
  });

  it("should not find an activity at a time outside of any activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);
    const activity = store.findActivityAtTime(90, TEST_DATE);
    expect(activity).toBeNull();
  });

  it("should find activities from a specific time", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 2,
        name: "Test Activity 2",
        start_time_minutes: 60,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);
    const foundActivities = store.findActivitiesAfterTime(30, TEST_DATE);
    expect(foundActivities.length).toBe(1);
    expect(foundActivities[0].name).toBe("Test Activity 2");
  });

  it("should insert an activity at a specific time", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 2,
        name: "Test Activity 2",
        start_time_minutes: 120,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(60, TEST_DATE, {
      name: "Inserted Activity",
      start_time_minutes: 60,
    });

    const insertedActivity = store.findActivityAtTime(60, TEST_DATE);
    expect(insertedActivity).not.toBeNull();
    expect(insertedActivity?.name).toBe("Inserted Activity");
    expect(insertedActivity?.duration_minutes).toBe(60);
  });

  it("should remove an existing activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);

    store.removeActivity(1);

    const removedActivity = store.findActivityAtTime(30, TEST_DATE);
    expect(removedActivity).toBeNull();
  });

  it("should adjust the duration of an existing activity if the new activity starts within it", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 0,
        duration_minutes: 120,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(60, TEST_DATE, {
      name: "Inserted Activity",
      start_time_minutes: 60,
    });

    const existingActivity = store.findActivityAtTime(30, TEST_DATE);
    expect(existingActivity).not.toBeNull();
    expect(existingActivity?.duration_minutes).toBe(60);
  });

  it("should remove the existing activity if the new activity covers it completely", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 60,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(60, TEST_DATE, {
      name: "New Activity",
      start_time_minutes: 60,
    });

    const oldActivity = store.findActivityAtTime(60, TEST_DATE);
    expect(oldActivity).not.toBeNull();

    store.removeActivity(oldActivity.id);
    const removedActivity = store.findActivityAtTime(60, TEST_DATE);
    expect(removedActivity).toBeNull();
  });

  it("should correctly insert a new activity and adjust the duration of the existing activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Test Activity 1",
        start_time_minutes: 0,
        duration_minutes: 120,
        date: TEST_DATE,
      },
      {
        id: 2,
        name: "Test Activity 2",
        start_time_minutes: 120,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(60, TEST_DATE, {
      name: "Inserted Activity",
      start_time_minutes: 60,
    });

    const insertedActivity = store.findActivityAtTime(60, TEST_DATE);
    expect(insertedActivity).not.toBeNull();
    expect(insertedActivity?.name).toBe("Inserted Activity");
    expect(insertedActivity?.duration_minutes).toBe(60);

    const existingActivity = store.findActivityAtTime(30, TEST_DATE);
    expect(existingActivity).not.toBeNull();
    expect(existingActivity?.duration_minutes).toBe(60);
  });

  it("should insert into an empty schedule", () => {
    const store = useActivityStore();
    store.insertActivityAtTime(60, TEST_DATE, { name: "New Activity" });
    const activities = store.getActivitiesForDay(TEST_DATE);
    expect(activities.length).toBe(1);
    expect(activities[0].start_time_minutes).toBe(60);
    expect(activities[0].duration_minutes).toBe(1440 - 60);
  });

  it("should insert before an existing activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Existing Activity",
        start_time_minutes: 120,
        duration_minutes: 120,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(60, TEST_DATE, { name: "New Activity" });
    const updatedActivities = store.getActivitiesForDay(TEST_DATE);

    expect(updatedActivities.length).toBe(2);
    expect(updatedActivities[0].start_time_minutes).toBe(60);
    expect(updatedActivities[0].duration_minutes).toBe(120 - 60);
    expect(updatedActivities[1].start_time_minutes).toBe(120);
    expect(updatedActivities[1].duration_minutes).toBe(120);
  });

  it("should insert after an existing activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Existing Activity",
        start_time_minutes: 60,
        duration_minutes: 120,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(180, TEST_DATE, { name: "New Activity" });
    const updatedActivities = store.getActivitiesForDay(TEST_DATE);

    expect(updatedActivities.length).toBe(2);
    expect(updatedActivities[0].start_time_minutes).toBe(60);
    expect(updatedActivities[0].duration_minutes).toBe(120);
    expect(updatedActivities[1].start_time_minutes).toBe(180);
    expect(updatedActivities[1].duration_minutes).toBe(1440 - 180);
  });

  it("should insert at the exact start time of an existing activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "First",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 2,
        name: "Second",
        start_time_minutes: 60,
        duration_minutes: 120,
        date: TEST_DATE,
      },
      {
        id: 3,
        name: "Third",
        start_time_minutes: 120,
        duration_minutes: 1320,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(60, TEST_DATE, { name: "New Activity" });
    const updatedActivities = store.getActivitiesForDay(TEST_DATE);

    expect(updatedActivities.length).toBe(3);
    expect(updatedActivities[0].start_time_minutes).toBe(0);
    expect(updatedActivities[0].name).toBe("First");
    expect(updatedActivities[1].start_time_minutes).toBe(60);
    expect(updatedActivities[1].duration_minutes).toBe(60);
    expect(updatedActivities[1].name).toBe("New Activity");
    expect(updatedActivities[2].start_time_minutes).toBe(120);
    expect(updatedActivities[2].name).toBe("Third");
  });

  it("should insert and steal time from an existing activity", () => {
    const store = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "First",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 2,
        name: "Second",
        start_time_minutes: 60,
        duration_minutes: 120,
        date: TEST_DATE,
      },
    ];
    store.initializeActivities(activities);

    store.insertActivityAtTime(20, TEST_DATE, { name: "New Activity" });
    const updatedActivities = store.getActivitiesForDay(TEST_DATE);

    expect(updatedActivities.length).toBe(3);
    expect(updatedActivities[0].start_time_minutes).toBe(0);
    expect(updatedActivities[0].duration_minutes).toBe(20);
    expect(updatedActivities[0].name).toBe("First");
    expect(updatedActivities[1].start_time_minutes).toBe(20);
    expect(updatedActivities[1].duration_minutes).toBe(40);
    expect(updatedActivities[1].name).toBe("New Activity");
    expect(updatedActivities[2].start_time_minutes).toBe(60);
    expect(updatedActivities[2].name).toBe("Second");
  });

  it("should insert at the end of the day", () => {
    const store = useActivityStore();
    store.insertActivityAtTime(1440, TEST_DATE, { name: "New Activity" });
    const activities = store.getActivitiesForDay(TEST_DATE);
    expect(activities.length).toBe(1);
    expect(activities[0].start_time_minutes).toBe(1440);
    expect(activities[0].duration_minutes).toBe(0);
  });
});
