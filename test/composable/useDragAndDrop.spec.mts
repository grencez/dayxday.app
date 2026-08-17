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
  const SECOND_DATE = "2023-10-28";
  let selectedDate = ref(TEST_DATE);
  let mockElementA: HTMLElement;
  let mockElementB: HTMLElement;
  let mockTimeMarkers: HTMLElement;
  let wrapper: VueWrapper;
  let onActivityTap: ReturnType<typeof vi.fn>;
  let startDrag: (
    e: MouseEvent | TouchEvent,
    item: Element,
    index: number,
  ) => void;
  let startGapDrag: (
    e: MouseEvent | TouchEvent,
    item: Element,
    start: number,
    end: number,
  ) => void;
  let moveDrag: (e: MouseEvent | TouchEvent) => void;
  let endDrag: () => void;

  beforeEach(() => {
    // Create a new Pinia instance before each test
    setActivePinia(createPinia());

    // Mock indexedDB
    global.indexedDB = new IDBFactory();

    const activityStore = useActivityStore();
    onActivityTap = vi.fn();
    selectedDate = ref(TEST_DATE);
    activities.value = [
      {
        id: 1,
        tagIds: ["tag-1"],
        start_time_minutes: 100,
        duration_minutes: 100,
        date: TEST_DATE,
      },
      {
        id: 2,
        tagIds: ["tag-1"],
        start_time_minutes: 200,
        duration_minutes: 100,
        date: TEST_DATE,
      },
      {
        id: 3,
        tagIds: ["tag-1"],
        start_time_minutes: 300,
        duration_minutes: 100,
        date: TEST_DATE,
      },
    ];
    activityStore.initializeActivities([
      ...activities.value,
      {
        id: 4,
        tagIds: ["tag-1"],
        start_time_minutes: 400,
        duration_minutes: 100,
        date: SECOND_DATE,
      },
    ]);

    mockElementA = document.createElement("div");
    mockElementA.style.top = "100px";
    mockElementA.style.height = "100px";
    mockElementA.addEventListener = vi.fn();
    mockElementA.dispatchEvent = vi.fn();
    mockElementA.getBoundingClientRect = vi.fn(
      () =>
        ({
          top: 100,
        }) as DOMRect,
    );

    mockElementB = document.createElement("div");
    mockElementB.style.top = "200px";
    mockElementB.style.height = "100px";
    mockElementB.addEventListener = vi.fn();
    mockElementB.dispatchEvent = vi.fn();
    mockElementB.getBoundingClientRect = vi.fn(
      () =>
        ({
          top: 200,
        }) as DOMRect,
    );

    mockTimeMarkers = document.createElement("div");
    mockTimeMarkers.getBoundingClientRect = vi.fn(
      () =>
        ({
          left: 0,
          right: 100,
          top: 0,
        }) as DOMRect,
    );

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
        ] as unknown as NodeListOf<Element>;
      }
      return [] as unknown as NodeListOf<Element>;
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
        const dragAndDrop = useDragAndDrop(selectedDate, onActivityTap);
        startDrag = dragAndDrop.startDrag;
        startGapDrag = dragAndDrop.startGapDrag;
        moveDrag = dragAndDrop.moveDrag;
        endDrag = dragAndDrop.endDrag;
        return {
          get activities() {
            return activityStore.getActivitiesForDay(TEST_DATE);
          },
        };
      },
      template: "<div></div>",
    });

    wrapper = mount(TestComponent);
  });

  it("treats a surface release below the movement threshold as a tap", async () => {
    await nextTick();

    startDrag(
      new MouseEvent("mousedown", { clientX: 20, clientY: 150 }),
      mockElementA,
      0,
    );
    moveDrag(new MouseEvent("mousemove", { clientX: 23, clientY: 154 }));
    endDrag();

    expect(onActivityTap).toHaveBeenCalledOnce();
    expect(onActivityTap).toHaveBeenCalledWith(1, 150);
    expect(wrapper.vm.activities[0].duration_minutes).toBe(100);
  });

  it("ignores horizontal jitter when distinguishing a tap from a vertical drag", async () => {
    await nextTick();

    startDrag(
      new MouseEvent("mousedown", { clientX: 20, clientY: 150 }),
      mockElementA,
      0,
    );
    moveDrag(new MouseEvent("mousemove", { clientX: 80, clientY: 150 }));
    endDrag();

    expect(onActivityTap).toHaveBeenCalledWith(1, 150);
    expect(
      wrapper.vm.activities.map((activity) => activity.start_time_minutes),
    ).toEqual([100, 200, 300]);
  });

  it("supports touch taps without mutating timing", async () => {
    await nextTick();
    const touchStart = new Event("touchstart", {
      bubbles: true,
      cancelable: true,
    }) as TouchEvent;
    Object.defineProperty(touchStart, "touches", {
      value: [{ clientX: 20, clientY: 150 }],
    });

    startDrag(touchStart, mockElementA, 0);
    endDrag();

    expect(onActivityTap).toHaveBeenCalledWith(1, 150);
    expect(wrapper.vm.activities[0].duration_minutes).toBe(100);
  });

  it("rolls timing back when a touch drag is cancelled", async () => {
    await nextTick();
    const touchStart = new Event("touchstart", {
      bubbles: true,
      cancelable: true,
    }) as TouchEvent;
    Object.defineProperty(touchStart, "touches", {
      value: [{ clientX: 150, clientY: 150 }],
    });
    const touchMove = new Event("touchmove", {
      bubbles: true,
      cancelable: true,
    }) as TouchEvent;
    Object.defineProperty(touchMove, "touches", {
      value: [{ clientX: 150, clientY: 180 }],
    });

    startDrag(touchStart, mockElementA, 0);
    moveDrag(touchMove);
    expect(wrapper.vm.activities[0].duration_minutes).not.toBe(100);
    window.dispatchEvent(new Event("touchcancel"));

    expect(onActivityTap).not.toHaveBeenCalled();
    expect(
      wrapper.vm.activities.map((activity) => [
        activity.start_time_minutes,
        activity.duration_minutes,
      ]),
    ).toEqual([
      [100, 100],
      [200, 100],
      [300, 100],
    ]);
  });

  it("uses a real surface drag to move only the shared boundary", async () => {
    await nextTick();

    startDrag(
      new MouseEvent("mousedown", { clientX: 20, clientY: 150 }),
      mockElementA,
      0,
    );
    moveDrag(new MouseEvent("mousemove", { clientX: 150, clientY: 185 }));
    endDrag();

    expect(onActivityTap).not.toHaveBeenCalled();
    expect(
      wrapper.vm.activities.map((activity) => [
        activity.start_time_minutes,
        activity.duration_minutes,
      ]),
    ).toEqual([
      [100, 135],
      [235, 65],
      [300, 100],
    ]);
  });

  it("snaps to the nearest 15-minute boundary while resizing over the time margin", async () => {
    await nextTick();

    startDrag(new MouseEvent("mousedown", { clientY: 150 }), mockElementA, 0);
    moveDrag(
      new MouseEvent("mousemove", {
        clientY: 172,
        clientX: 50,
      }),
    );
    endDrag();

    expect(wrapper.vm.activities[0].duration_minutes).toBe(65);
    expect(wrapper.vm.activities[1]).toMatchObject({
      start_time_minutes: 165,
      duration_minutes: 135,
    });
    expect(wrapper.vm.activities[2]).toMatchObject({
      start_time_minutes: 300,
      duration_minutes: 100,
    });
  });

  it("uses the currently selected date when a drag starts", async () => {
    await nextTick();
    const activityStore = useActivityStore();
    selectedDate.value = SECOND_DATE;
    await nextTick();

    startDrag(new MouseEvent("mousedown", { clientY: 150 }), mockElementA, 0);
    moveDrag(new MouseEvent("mousemove", { clientY: 185, clientX: 150 }));
    endDrag();

    expect(
      activityStore.getActivitiesForDay(TEST_DATE)[0].duration_minutes,
    ).toBe(100);
    expect(
      activityStore.getActivitiesForDay(SECOND_DATE)[0].duration_minutes,
    ).toBe(135);
  });

  it("keeps a surface drag bound to the date where the gesture started", async () => {
    await nextTick();
    const activityStore = useActivityStore();

    startDrag(new MouseEvent("mousedown", { clientY: 150 }), mockElementA, 0);
    selectedDate.value = SECOND_DATE;
    await nextTick();

    moveDrag(new MouseEvent("mousemove", { clientY: 180, clientX: 150 }));
    expect(() => endDrag()).not.toThrow();

    const firstDay = activityStore.getActivitiesForDay(TEST_DATE);
    expect(firstDay[0].duration_minutes).toBe(130);
    expect(firstDay[1].start_time_minutes).toBe(230);
    expect(firstDay[1].duration_minutes).toBe(70);
    expect(
      activityStore.getActivitiesForDay(SECOND_DATE)[0].duration_minutes,
    ).toBe(100);
  });

  it("drags an unfilled end by moving the following activity start", async () => {
    await nextTick();
    const activityStore = useActivityStore();
    activityStore.updateActivity(2, {
      start_time_minutes: 250,
      duration_minutes: 50,
    });
    const gapElement = document.createElement("button");

    startGapDrag(
      new MouseEvent("mousedown", { clientY: 225 }),
      gapElement,
      200,
      250,
    );
    moveDrag(new MouseEvent("mousemove", { clientY: 240, clientX: 150 }));
    endDrag();

    expect(wrapper.vm.activities).toMatchObject([
      { id: 1, start_time_minutes: 100, duration_minutes: 100 },
      { id: 2, start_time_minutes: 265, duration_minutes: 35 },
      { id: 3, start_time_minutes: 300, duration_minutes: 100 },
    ]);
  });

  it("resizes only the activity end when the following activity has a gap", async () => {
    await nextTick();
    const activityStore = useActivityStore();
    activityStore.updateActivity(2, {
      start_time_minutes: 250,
      duration_minutes: 50,
    });

    startDrag(new MouseEvent("mousedown", { clientY: 150 }), mockElementA, 0);
    moveDrag(new MouseEvent("mousemove", { clientY: 185, clientX: 150 }));
    endDrag();

    expect(
      wrapper.vm.activities.map((activity) => [
        activity.start_time_minutes,
        activity.duration_minutes,
      ]),
    ).toEqual([
      [100, 135],
      [250, 50],
      [300, 100],
    ]);
  });

  it("should not snap when resizing and mouse is outside time markers area", async () => {
    await nextTick();

    const initialDuration = wrapper.vm.activities[0].duration_minutes;

    // Simulate mousedown on the first activity to start resizing
    const mousedownEvent = new MouseEvent("mousedown", { clientY: 150 });
    startDrag(mousedownEvent, mockElementA, 0);

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
    expect(wrapper.vm.activities[1]).toMatchObject({
      start_time_minutes: 235,
      duration_minutes: 65,
    });
    expect(wrapper.vm.activities[2]).toMatchObject({
      start_time_minutes: 300,
      duration_minutes: 100,
    });
  });
});
