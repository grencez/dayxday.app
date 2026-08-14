import { mount } from "@vue/test-utils";
import DayView from "@/view/DayView.vue";
import ActivityItem from "@/component/ActivityItem.vue";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";
import { useActivityStore, Activity } from "@/store/activity";
import { getLocalDateString } from "@/function/getLocalDateString";

describe("DayView.vue", () => {
  const TEST_DATE = getLocalDateString();

  // Pin the clock to noon on TEST_DATE's calendar day. The two click tests
  // insert an activity at 2:20 AM (140 min), which is only "in the past" when
  // the test's "now" is later than 2:20. Basing "now" on the real wall clock
  // makes the suite fail whenever it runs before 02:20 local time (e.g. CI in
  // UTC while it's still evening in PDT).
  function noonOnTestDate(): Date {
    const [year, month, day] = TEST_DATE.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    // Mock indexedDB
    global.indexedDB = new IDBFactory();
    // Create a new Pinia instance before each test
    setActivePinia(createPinia());
    const activityStore = useActivityStore();
    const activities: Activity[] = [
      {
        id: 1,
        name: "Activity 1",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 2,
        name: "Activity 2",
        start_time_minutes: 60,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 3,
        name: "Activity 3",
        start_time_minutes: 120,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 4,
        name: "Activity 4",
        start_time_minutes: 180,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 5,
        name: "Activity 5",
        start_time_minutes: 240,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 6,
        name: "Activity 6",
        start_time_minutes: 300,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 7,
        name: "Activity 7",
        start_time_minutes: 360,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 8,
        name: "Activity 8",
        start_time_minutes: 420,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 9,
        name: "Activity 9",
        start_time_minutes: 480,
        duration_minutes: 60,
        date: TEST_DATE,
      },
      {
        id: 10,
        name: "Activity 10",
        start_time_minutes: 540,
        duration_minutes: 60,
        date: TEST_DATE,
      },
    ];
    await activityStore.initializeActivities(activities);
  });

  it("renders the Day View heading", () => {
    const wrapper = mount(DayView);
    expect(wrapper.text()).toContain("Day View");
  });

  it("does not render Reset or Clear controls", () => {
    const wrapper = mount(DayView);
    expect(wrapper.find(".reset-button").exists()).toBe(false);
    expect(wrapper.find(".clear-button").exists()).toBe(false);
  });

  it("shows timeline creation instructions when the day is empty", () => {
    const activityStore = useActivityStore();
    activityStore.clearActivitiesForDay(TEST_DATE);
    const wrapper = mount(DayView);

    expect(wrapper.find(".empty-state").text()).toBe(
      "Click or tap the timeline on the left to create your first activity.",
    );
  });

  it("renders the time markers", () => {
    const wrapper = mount(DayView);
    const timeMarkers = wrapper.findAll(".time-axis-mark");
    expect(timeMarkers.length).toBe(25);
  });

  it("renders the activities", async () => {
    const wrapper = mount(DayView);
    await new Promise((resolve) => setTimeout(resolve, 0)); // Wait for onMounted
    const activityItems = wrapper.findAll(".activity-item");
    expect(activityItems.length).toBe(10);
  });

  it("should create a new activity when a time marker is clicked", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(noonOnTestDate());
    const wrapper = mount(DayView);
    const activityStore = useActivityStore();
    const timeMarkersArea = wrapper.find(".time-axis-area");
    const timeMarkersAreaElement = timeMarkersArea.element as HTMLElement;

    // Mock getBoundingClientRect
    vi.spyOn(timeMarkersAreaElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 1440,
      top: 0,
      left: 0,
      right: 100,
      bottom: 1440,
      toJSON: () => {
        return {
          x: 0,
          y: 0,
          width: 100,
          height: 1440,
          top: 0,
          left: 0,
          right: 100,
          bottom: 1440,
        };
      },
    } as DOMRect);

    const rect = timeMarkersAreaElement.getBoundingClientRect();

    // Simulate a click on the time marker area at the vertical position of the 3rd time marker (hour 2)
    const y = ((2 * 60 + 20) / 1440) * rect.height;

    await timeMarkersArea.trigger("click", { clientY: rect.top + y });
    await wrapper.vm.$nextTick();

    // Check that a new activity has been created
    const activities = activityStore.getActivitiesForDay(TEST_DATE);
    expect(activities.length).toBe(11);

    // Check that the new activity has the correct start time and default name
    const newActivity = activities.find(
      (activity) => activity.name === "New Activity",
    );
    expect(newActivity).toBeDefined();
    expect(newActivity?.start_time_minutes).toBe(140);
    expect(newActivity?.duration_minutes).toBe(40);

    // Check that the new activity has the correct duration
    const activityAfterNew = activities.find(
      (activity) => activity.start_time_minutes === 180,
    );
    expect(activityAfterNew?.start_time_minutes).toBe(180);

    // Check that the activities are still in order
    for (let i = 0; i < activities.length - 1; i++) {
      expect(activities[i].start_time_minutes).toBeLessThan(
        activities[i + 1].start_time_minutes,
      );
    }
  });

  it("should resize the correct activity after inserting a new activity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(noonOnTestDate());
    const wrapper = mount(DayView, {
      attachTo: document.body,
    });
    const activityStore = useActivityStore();
    const timeMarkersArea = wrapper.find(".time-axis-area");
    const timeMarkersAreaElement = timeMarkersArea.element as HTMLElement;

    // Mock getBoundingClientRect for timeMarkersArea
    vi.spyOn(timeMarkersAreaElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 1440,
      top: 0,
      left: 0,
      right: 100,
      bottom: 1440,
      toJSON: () => ({}),
    } as DOMRect);

    // Insert new activity at 140 min (like previous test)
    const rect = timeMarkersAreaElement.getBoundingClientRect();
    const y = ((2 * 60 + 20) / 1440) * rect.height;
    await timeMarkersArea.trigger("click", { clientY: rect.top + y });
    await wrapper.vm.$nextTick();

    const newActivity = activityStore
      .getActivitiesForDay(TEST_DATE)
      .find((activity) => activity.name === "New Activity");
    expect(newActivity).toBeDefined();

    // Now resize the FIRST activity (id=1, 0-60min)
    const firstActivityItem = wrapper.findAll(".activity-item")[0];
    const firstActivityElement = firstActivityItem.element as HTMLElement;

    // Mock getBoundingClientRect for the activity
    vi.spyOn(firstActivityElement, "getBoundingClientRect").mockReturnValue({
      top: 0,
      height: 60,
      left: 0,
      right: 100,
      bottom: 60,
      x: 0,
      y: 0,
      width: 100,
      toJSON: () => ({}),
    } as DOMRect);

    // Mock getBoundingClientRect for the border (if we were dragging border)
    // But here we might drag activity itself?
    // "should resize ... activity" implies dragging activity?
    // Wait, dragging activity body moves it? Or resizes?
    // useDragAndDrop:
    // - startActivityDrag (item): "ns-resize" -> resize activity height.
    // - startBorderDrag (border): resize two activities.

    // Let's assume we drag the bottom of the activity?
    // If we drag the activity item itself, `startActivityDrag` is called.
    // `startActivityDrag` sets `isResizingActivity = true`.
    // Then `handleActivityResize` updates duration.

    // Simulate mousedown on the first activity item
    await firstActivityItem.trigger("mousedown", { clientY: 10 });

    // Simulate mousemove on WINDOW to resize
    // Moving down increases duration.
    // Original duration 60. Mouse starts at 10.
    // Move mouse to 50. Diff = 40.
    // New duration should be 60 + 40 = 100.

    // Note: useDragAndDrop uses `mouse_orig_screen_y` from mousedown event.
    // Then `mouse_curr_screen_y` from mousemove event.
    // Then `border_curr_screen_y += mouse_curr_screen_y - mouse_orig_screen_y`.
    // Then `diffY = border_curr_screen_y - border_orig_screen_y`.
    // `border_orig_screen_y` is calculated from `time_axis_area.top + start + duration`.

    // Let's ensure time_axis_area querySelector works inside useDragAndDrop
    // We mocked getBoundingClientRect on the element, but useDragAndDrop does document.querySelector(".time-axis-area").
    // JSDOM document should have it because we attached to body?
    // If not, we might need to mock querySelector or ensure mount attaches to body.
    // Added `attachTo: document.body` above.

    // Dispatch mousemove on window
    // Use clientX: 200 to be outside the time-axis-area (0-100) to avoid snapping
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientY: 50, clientX: 200 }),
    );

    // Dispatch mouseup on window
    window.dispatchEvent(new MouseEvent("mouseup"));

    // Check that the first activity's duration has changed
    // Initial 60. Moved +40. Expect 100.
    const firstActivity = activityStore.getActivitiesForDay(TEST_DATE)[0];
    // Note: 10 -> 50 is +40 pixels.
    // 1 pixel = 1 minute?
    // Yes, default scaling is 1px = 1min (1440px height for 1440 mins).

    expect(firstActivity.duration_minutes).toBe(100);

    // Check that the new activity's duration has not changed
    // New activity starts at 140.
    // First activity 0 -> 100.
    // Activity 2 (60 -> 120) gets pushed?
    // logic: `for (let i = activityIndex + 1; ...)` updates start times.

    // Original Activity 2: start 60, dur 60.
    // After resize Activity 1 to 100:
    // Activity 2 start becomes 0 + 100 = 100.
    // Activity 3 start (was 120) -> Activity 2 end is 100+60=160.
    // So Activity 3 start becomes 160.

    // The new activity was inserted at 140 (start 140, dur 40).
    // It was inserted into the list.
    // List order before insert: 1(0-60), 2(60-60), 3(120-60), ...
    // Insert at 140:
    // 3 covers 120-180.
    // Insert 140 breaks 3.
    // New 3 becomes 120-140 (dur 20).
    // New activity 140-180 (dur 40).
    // Old 3 (rest) ? No, logic handles it.

    // Wait, insert logic:
    // "existingActivity" at 140 is Activity 3 (120-180).
    // "existingActivity.duration_minutes = time - existingActivity.start_time_minutes" -> 140 - 120 = 20.
    // Activity 3 becomes 120-140.
    // New activity inserted at 140. Duration?
    // "nextActivities[0]" is Activity 4 (180).
    // duration = 180 - 140 = 40.
    // So New Activity is 140-180.

    // So list:
    // 1: 0-60
    // 2: 60-120
    // 3: 120-140
    // New: 140-180
    // 4: 180-240

    // Now resize Activity 1 (0-60) by +40 -> 0-100.
    // Logic updates subsequent start times.
    // 2: start becomes 100. (end 160)
    // 3: start becomes 160. (end 180)
    // New: start becomes 180. (end 220)
    // 4: start becomes 220.

    // Test says "Check that the new activity's duration has not changed".
    // New activity duration should still be 40.
    expect(newActivity?.duration_minutes).toBe(40);

    // Verify start times to be sure
    const activities = activityStore.getActivitiesForDay(TEST_DATE);
    const updatedNewActivity = activities.find(
      (a) => a.name === "New Activity",
    );
    expect(updatedNewActivity?.start_time_minutes).toBe(180); // shifted by 40

    wrapper.unmount();
  });

  it("updates the store when an activity is renamed", async () => {
    const wrapper = mount(DayView);
    await new Promise((resolve) => setTimeout(resolve, 0)); // Wait for onMounted
    const activityStore = useActivityStore();
    const firstItem = wrapper.findComponent(ActivityItem);
    firstItem.vm.$emit("rename", { id: 1, name: "Renamed Activity" });
    await wrapper.vm.$nextTick();
    const renamed = activityStore
      .getActivitiesForDay(TEST_DATE)
      .find((a) => a.id === 1);
    expect(renamed?.name).toBe("Renamed Activity");
    wrapper.unmount();
  });
});
