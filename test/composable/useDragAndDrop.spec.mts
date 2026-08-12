import { useDragAndDrop } from "@/composable/useDragAndDrop";
import { ref, defineComponent, nextTick } from "vue";
import { mount, VueWrapper } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";
import { useActivityStore, Activity } from "@/store/activity";

describe("useDragAndDrop", () => {
  const activities = ref<Activity[] | null>(null);
  const TEST_DATE = "2023-10-27";
  let mockElementA: HTMLElement;
  let mockElementB: HTMLElement;
  let mockBorder: HTMLElement;
  let mockTimeMarkers: HTMLElement;
  let wrapper: VueWrapper;
  let startDrag: (
    e: MouseEvent | TouchEvent,
    item: Element,
    index: number,
    isBorder: boolean,
  ) => void;
  let moveDrag: (e: MouseEvent | TouchEvent) => void;
  let endDrag: () => void;

  beforeEach(() => {
    // Create a new Pinia instance before each test
    setActivePinia(createPinia());

    // Mock indexedDB
    global.indexedDB = new IDBFactory();

    const activityStore = useActivityStore();
    activities.value = [
      {
        id: 1,
        name: "Activity A",
        start_time_minutes: 100,
        duration_minutes: 100,
        date: TEST_DATE,
      },
      {
        id: 2,
        name: "Activity B",
        start_time_minutes: 200,
        duration_minutes: 100,
        date: TEST_DATE,
      },
      {
        id: 3,
        name: "Activity C",
        start_time_minutes: 300,
        duration_minutes: 100,
        date: TEST_DATE,
      },
    ];
    activityStore.initializeActivities(activities.value);

    mockElementA = document.createElement("div");
    mockElementA.style.top = "100px";
    mockElementA.style.height = "100px";
    mockElementA.addEventListener = vi.fn();
    mockElementA.dispatchEvent = vi.fn();
    mockElementA.getBoundingClientRect = vi.fn(() => ({
      top: 100,
    } as DOMRect));

    mockElementB = document.createElement("div");
    mockElementB.style.top = "200px";
    mockElementB.style.height = "100px";
    mockElementB.addEventListener = vi.fn();
    mockElementB.dispatchEvent = vi.fn();
    mockElementB.getBoundingClientRect = vi.fn(() => ({
      top: 200,
    } as DOMRect));

    mockBorder = document.createElement("div");
    mockBorder.style.top = "200px";
    mockBorder.addEventListener = vi.fn();
    mockBorder.dispatchEvent = vi.fn();
    mockBorder.getBoundingClientRect = vi.fn(() => ({
      top: 200,
    } as DOMRect));

    mockTimeMarkers = document.createElement("div");
    mockTimeMarkers.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      right: 100,
      top: 0,
    } as DOMRect));

    vi.spyOn(document, "querySelectorAll").mockImplementation((selector) => {
      if (selector === ".activity-item") {
        return [
          mockElementA,
          mockElementB,
          {
            style: { top: "", height: "" },
            addEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
            getBoundingClientRect: () => ({
              top: 300,
            }),
          },
        ] as any;
      } else if (selector === ".activity-border") {
        return [
          mockBorder,
          {
            style: { top: "" },
            addEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
            getBoundingClientRect: () => ({
              top: 300,
            }),
          },
        ] as any;
      }
      return [] as any;
    });
    vi.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === ".time-axis-area") {
        return mockTimeMarkers;
      }
      return null;
    });

    const TestComponent = defineComponent({
      setup() {
        const activityStore = useActivityStore();
        const dragAndDrop = useDragAndDrop(TEST_DATE);
        startDrag = dragAndDrop.startDrag;
        moveDrag = dragAndDrop.moveDrag;
        endDrag = dragAndDrop.endDrag;
        return {
            get activities() { return activityStore.getActivitiesForDay(TEST_DATE) }
        };
      },
      template: "<div></div>",
    });

    wrapper = mount(TestComponent);
  });

  it("should not change start time of activity A or end time of activity B when dragging the border", async () => {
    await nextTick(); // Wait for onMounted to run

    const currentActivities = wrapper.vm.activities;
    expect(currentActivities).not.toBeNull();
    if (currentActivities) {
      const initialStartTimeA = currentActivities[0].start_time_minutes;
      const initialEndTimeB =
        currentActivities[1].start_time_minutes +
        currentActivities[1].duration_minutes;

      // Simulate mousedown on the border between A and B
      const mousedownEvent = new MouseEvent("mousedown", { clientY: 150 });
      startDrag(mousedownEvent, mockBorder, 0, true);

      // Simulate mousemove to resize the border
      const mousemoveEvent = new MouseEvent("mousemove", { clientY: 200 });
      moveDrag(mousemoveEvent);
      endDrag();

      // Assert that start time of A and end time of B have not changed
      expect(wrapper.vm.activities[0].start_time_minutes).toBe(
        initialStartTimeA,
      );
      expect(
        wrapper.vm.activities[1].start_time_minutes +
          wrapper.vm.activities[1].duration_minutes,
      ).toBe(initialEndTimeB);
    }
  });

  it("should snap to the nearest hour marker when resizing and mouse is in time markers area", async () => {
    await nextTick(); // Wait for onMounted to run

    // Simulate mousedown on the first activity to start resizing
    const mousedownEvent = new MouseEvent("mousedown", { clientY: 150 });
    startDrag(mousedownEvent, mockElementA, 0, false);

    // Simulate mousemove to a position within the time markers area
    const mousemoveEvent = new MouseEvent("mousemove", {
      clientY: 180, // Between hour markers (e.g., between 2nd and 3rd hour)
      clientX: 50, // Within the time markers area (left: 0, right: 100)
    });
    moveDrag(mousemoveEvent);
    endDrag();

    // Assert that the activity's end time snaped to the nearest hour marker
    const newDuration = wrapper.vm.activities[0].duration_minutes;

    // Calculate what the snapped end time should have been
    const nearestHour = Math.round(180 / 60); // 60 is the height of an hour
    const expectedSnappedEndTime = nearestHour * 60;
    const expectedSnappedDuration =
      expectedSnappedEndTime - wrapper.vm.activities[0].start_time_minutes;

    expect(newDuration).toBe(expectedSnappedDuration);
  });

  it("should not snap when resizing and mouse is outside time markers area", async () => {
    await nextTick();

    const initialDuration = wrapper.vm.activities[0].duration_minutes;

    // Simulate mousedown on the first activity to start resizing
    const mousedownEvent = new MouseEvent("mousedown", { clientY: 150 });
    startDrag(mousedownEvent, mockElementA, 0, false);

    // Simulate mousemove to a position outside the time markers area
    const mousemoveEvent = new MouseEvent("mousemove", {
      clientY: 185, // A value not corresponding to an exact hour
      clientX: 150, // Outside the time markers area (left: 0, right: 100)
    });
    moveDrag(mousemoveEvent);
    endDrag();

    // Assert that the activity's duration changed proportionally to the mouse movement
    const newDuration = wrapper.vm.activities[0].duration_minutes;
    const expectedDuration = initialDuration + (185 - 150); // Mouse moved 35 pixels

    expect(newDuration).toBe(expectedDuration);
  });
});
