import { useDragAndDrop } from "@/asset/composable/useDragAndDrop";
import { useActivityDatabase } from "@/asset/composable/useActivityDatabase";
import { ref, defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { IDBFactory } from 'fake-indexeddb';
import { Activity } from '../../src/asset/model/Activity';
import { createPinia, setActivePinia } from "pinia";
import { useActivityStore } from "../../src/asset/store/activityStore";

describe("useDragAndDrop", () => {
  let activities = ref(null);
  let mockElementA: any;
  let mockElementB: any;
  let mockBorder: any;
  let mockTimeMarkers: any;

  beforeEach(() => {
    // Create a new Pinia instance before each test
    setActivePinia(createPinia());

    // Mock indexedDB
    global.indexedDB = new IDBFactory();

    const activityStore = useActivityStore();
    activities.value = [
      new Activity(1, "Activity A", 100, 100),
      new Activity(2, "Activity B", 200, 100),
      new Activity(3, "Activity C", 300, 100),
    ];
    activityStore.initializeActivities(activities.value);

    mockElementA = {
      style: {
        top: "",
        height: "",
      },
      addEventListener: vi.fn(),
    };
    mockElementB = {
      style: {
        top: "",
        height: "",
      },
      addEventListener: vi.fn(),
    };
    mockBorder = {
      style: {
        top: "",
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
    };
    mockTimeMarkers = {
      getBoundingClientRect: () => ({
        left: 0,
        right: 100,
        top: 0,
      }),
    };

    vi.spyOn(document, "querySelectorAll").mockImplementation((selector) => {
      if (selector === ".activity-item") {
        return [
          mockElementA,
          mockElementB,
          { style: { top: "", height: "" }, addEventListener: vi.fn() },
        ];
      } else if (selector === ".activity-border") {
        return [mockBorder, { style: { top: "" }, addEventListener: vi.fn() }];
      }
      return [];
    });
    vi.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === ".time-markers") {
        return mockTimeMarkers;
      }
      return null;
    });
  });

  it("should not change start time of activity A or end time of activity B when dragging the border", async () => {
    const TestComponent = defineComponent({
      setup() {
        const activityStore = useActivityStore();
        const { getActivities } = useActivityDatabase();
        useDragAndDrop();
        return { activities: activityStore.getActivitiesForDay };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick(); // Wait for onMounted to run

    expect(wrapper.vm.activities).not.toBeNull();
    if (wrapper.vm.activities) {
      const initialStartTimeA = wrapper.vm.activities[0].startTime;
      const initialEndTimeB =
        wrapper.vm.activities[1].startTime + wrapper.vm.activities[1].duration;

      // Simulate mousedown on the border between A and B
      const mousedownEvent = new MouseEvent("mousedown", { clientY: 150 });
      mockBorder.dispatchEvent(mousedownEvent);

      // Simulate mousemove to resize the border
      const mousemoveEvent = new MouseEvent("mousemove", { clientY: 200 });
      window.dispatchEvent(mousemoveEvent);

      // Simulate mouseup to end the drag
      const mouseupEvent = new MouseEvent("mouseup");
      window.dispatchEvent(mouseupEvent);

      // Assert that start time of A and end time of B have not changed
      expect(wrapper.vm.activities[0].startTime).toBe(initialStartTimeA);
      expect(
        wrapper.vm.activities[1].startTime + wrapper.vm.activities[1].duration,
      ).toBe(initialEndTimeB);
    }
  });
});
