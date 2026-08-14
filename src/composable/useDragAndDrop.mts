import { onMounted, onUnmounted, ref, nextTick, type Ref } from "vue";
import { useActivityStore } from "../store/activity";
import { calculateSnappedY } from "../function/calculateSnappedY";
import { isMouseInTimeAxisArea } from "../function/isMouseInTimeAxisArea";
import { updateActivityElementStyle } from "../function/updateActivityElementStyle";

// Main Composable
export function useDragAndDrop(date: Ref<string>) {
  const activityStore = useActivityStore();
  const isDragging = ref(false);

  let draggedItem: HTMLElement | null = null;
  let isResizingActivity = false;
  let isResizingBorder = false;
  let draggedActivityId: number | null = null;
  let draggedBorderIndex: number | null = null;
  let draggedDate: string | null = null;

  let initialStartTime = 0;
  let initialDurationA = 0;
  let initialDurationB = 0;

  let mouse_orig_screen_y = 0;
  let border_orig_screen_y = 0;

  // --- Event Handlers ---

  /**
   * Initiates the dragging process.
   */
  const startDrag = (
    e: MouseEvent | TouchEvent,
    item: Element,
    index: number,
    isBorder: boolean,
  ) => {
    isDragging.value = true;
    e.preventDefault();
    draggedItem = item as HTMLElement;
    draggedDate = date.value;
    mouse_orig_screen_y =
      (e as MouseEvent).clientY ||
      ((e as TouchEvent).touches && (e as TouchEvent).touches[0].clientY) ||
      0;

    if (isBorder) {
      startBorderDrag(index);
    } else {
      startActivityDrag(item, index);
    }
  };

  /**
   * Handles the start of border dragging.
   */
  const startBorderDrag = (index: number) => {
    draggedBorderIndex = index;
    isResizingBorder = true;
    isResizingActivity = false;

    // Store the original top position of the border using getBoundingClientRect
    const borderElement = document.querySelectorAll(".activity-border")[
      index
    ] as HTMLElement;

    const activities = activityStore.getActivitiesForDay(draggedDate!);

    initialDurationA = activities[draggedBorderIndex].duration_minutes;
    initialDurationB = activities[draggedBorderIndex + 1].duration_minutes;
    initialStartTime = activities[draggedBorderIndex].start_time_minutes;

    border_orig_screen_y = borderElement.getBoundingClientRect().top;
  };

  /**
   * Handles the start of activity dragging.
   */
  const startActivityDrag = (item: Element, index: number) => {
    const activities = activityStore.getActivitiesForDay(draggedDate!);
    const activity = activities[index];
    draggedActivityId = activity.id;
    (item as HTMLElement).style.cursor = "ns-resize";
    initialStartTime = activity.start_time_minutes;
    initialDurationA = activity.duration_minutes;
    isResizingActivity = true;
    isResizingBorder = false;

    const time_axis_area = document.querySelector(".time-axis-area");
    border_orig_screen_y =
      time_axis_area?.getBoundingClientRect().top +
      initialStartTime +
      initialDurationA;
  };

  /**
   * Handles the drag movement.
   */
  const moveDrag = (e: MouseEvent | TouchEvent) => {
    if (!draggedItem || !isDragging.value) return;

    const mouse_curr_screen_y =
      (e as MouseEvent).clientY ||
      ((e as TouchEvent).touches && (e as TouchEvent).touches[0].clientY);
    if (mouse_curr_screen_y === undefined) return;

    const time_axis_area = document.querySelector(".time-axis-area");
    const time_axis_area_rect = time_axis_area?.getBoundingClientRect();

    let border_curr_screen_y = border_orig_screen_y;
    if (time_axis_area_rect && isMouseInTimeAxisArea(e, time_axis_area_rect)) {
      border_curr_screen_y = calculateSnappedY(
        mouse_curr_screen_y,
        time_axis_area_rect,
      );
    } else {
      border_curr_screen_y += mouse_curr_screen_y - mouse_orig_screen_y;
    }

    if (isResizingActivity && draggedActivityId !== null) {
      const diffY = border_curr_screen_y - border_orig_screen_y;
      handleActivityResize(diffY);
    } else if (isResizingBorder && draggedBorderIndex !== null) {
      handleBorderDrag(border_curr_screen_y, draggedBorderIndex);
    }
  };

  /**
   * Handles the end of the dragging process.
   */
  const endDrag = () => {
    if (!isDragging.value) return;

    isDragging.value = false;

    if (draggedItem) {
      if (isResizingActivity && draggedActivityId !== null) {
        endActivityDrag();
      } else if (isResizingBorder && draggedBorderIndex !== null) {
        endBorderDrag();
      }

      draggedItem.style.cursor = "move";
      draggedItem = null;
      isResizingActivity = false;
      isResizingBorder = false;
      draggedActivityId = null;
      draggedBorderIndex = null;
      draggedDate = null;
    }
  };

  /**
   * Handles the end of activity dragging.
   */
  const endActivityDrag = () => {
    const activities = activityStore.getActivitiesForDay(draggedDate!);
    const activity = activities.find((a) => a.id === draggedActivityId);
    if (activity) {
      activityStore.updateActivity(activity.id, {
        duration_minutes: activity.duration_minutes,
      });
    }
  };

  /**
   * Handles the end of border dragging.
   */
  const endBorderDrag = () => {
    const activities = activityStore.getActivitiesForDay(draggedDate!);
    const activityA = activities[draggedBorderIndex!];
    const activityB = activities[draggedBorderIndex! + 1];
    activityStore.updateActivity(activityA.id, {
      duration_minutes: activityA.duration_minutes,
    });
    activityStore.updateActivity(activityB.id, {
      start_time_minutes: activityB.start_time_minutes,
      duration_minutes: activityB.duration_minutes,
    });
  };

  // --- Resizing and Dragging Logic ---

  /**
   * Handles the resizing of an activity.
   */
  function handleActivityResize(diffY: number) {
    const activities = activityStore.getActivitiesForDay(draggedDate!);
    const activity = activities.find((a) => a.id === draggedActivityId);
    if (!activity) return;

    const newDuration = initialDurationA + diffY;

    if (newDuration > 0) {
      activityStore.updateActivity(activity.id, {
        duration_minutes: newDuration,
      });
      const activityIndex = activities.findIndex((a) => a.id === activity.id);
      updateActivityElementStyle(activityIndex, {
        height: newDuration,
      });

      for (let i = activityIndex + 1; i < activities.length; i++) {
        const prevActivity = activities[i - 1];
        const newStartTime =
          prevActivity.start_time_minutes + prevActivity.duration_minutes;
        activityStore.updateActivity(activities[i].id, {
          start_time_minutes: newStartTime,
        });
        updateActivityElementStyle(i, { top: newStartTime });
      }
    }
  }

  /**
   * Handles the dragging of a border between activities.
   */
  function handleBorderDrag(
    border_curr_screen_y: number,
    draggedBorderIndex: number,
  ) {
    const activities = activityStore.getActivitiesForDay(draggedDate!);
    if (draggedBorderIndex < 0 || draggedBorderIndex >= activities.length - 1) {
      return;
    }

    const activityA = activities[draggedBorderIndex];
    const activityB = activities[draggedBorderIndex + 1];

    const diffY = border_curr_screen_y - border_orig_screen_y;
    const newDurationA = initialDurationA + diffY;
    const newDurationB = initialDurationB - diffY;

    if (newDurationA > 0 && newDurationB > 0) {
      // Update durations and start time
      activityStore.updateActivity(activityA.id, {
        duration_minutes: newDurationA,
      });
      activityStore.updateActivity(activityB.id, {
        start_time_minutes: initialStartTime + newDurationA,
        duration_minutes: newDurationB,
      });

      // Update element styles
      updateActivityElementStyle(draggedBorderIndex, {
        height: newDurationA,
      });
      updateActivityElementStyle(draggedBorderIndex + 1, {
        top: initialStartTime + newDurationA,
        height: newDurationB,
      });
    }
  }

  // --- Event Listeners ---

  onMounted(() => {
    nextTick(() => {
      const activityList = document.querySelector(".activity-list");
      if (activityList) {
        activityList.addEventListener("mousedown", handleMouseDown);
        activityList.addEventListener("touchstart", handleTouchStart, {
          passive: true,
        });
      }

      window.addEventListener("mousemove", moveDrag);
      window.addEventListener("touchmove", moveDrag, { passive: true });
      window.addEventListener("mouseup", endDrag);
      window.addEventListener("touchend", endDrag);

      const activities = activityStore.getActivitiesForDay(date.value);
      for (let i = 0; i < activities.length; i++) {
        updateActivityElementStyle(i, {
          top: activities[i].start_time_minutes,
          height: activities[i].duration_minutes,
        });
      }
    });
  });

  onUnmounted(() => {
    const activityList = document.querySelector(".activity-list");
    if (activityList) {
      activityList.removeEventListener("mousedown", handleMouseDown);
      activityList.removeEventListener("touchstart", handleTouchStart);
    }
    window.removeEventListener("mousemove", moveDrag);
    window.removeEventListener("touchmove", moveDrag);
    window.removeEventListener("mouseup", endDrag);
    window.removeEventListener("touchend", endDrag);
  });

  function handleMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const activities = activityStore.getActivitiesForDay(date.value);
    if (target.classList.contains("activity-item")) {
      const activityId = Number(target.dataset.activityId);
      const index = activities.findIndex((a) => a.id === activityId);
      if (index !== -1) {
        startDrag(e, target, index, false);
      }
    } else if (target.classList.contains("activity-border")) {
      const index = Number(target.dataset.borderIndex);
      if (!isNaN(index)) {
        startDrag(e, target, index, true);
      }
    }
  }

  function handleTouchStart(e: TouchEvent) {
    const target = e.target as HTMLElement;
    const activities = activityStore.getActivitiesForDay(date.value);
    if (target.classList.contains("activity-item")) {
      const activityId = Number(target.dataset.activityId);
      const index = activities.findIndex((a) => a.id === activityId);
      if (index !== -1) {
        startDrag(e, target, index, false);
      }
    } else if (target.classList.contains("activity-border")) {
      const index = Array.from(
        document.querySelectorAll(".activity-border"),
      ).indexOf(target);
      startDrag(e, target, index, true);
    }
  }

  return { startDrag, moveDrag, endDrag };
}
