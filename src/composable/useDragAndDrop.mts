import { onMounted, onUnmounted, ref, nextTick } from "vue";
import { useActivityStore } from "../store/activity";
import { calculateSnappedY } from "../function/calculateSnappedY";
import { isMouseInTimeMarkers } from "../function/isMouseInTimeMarkers";
import { updateActivityElementStyle } from "../function/updateActivityElementStyle";

// Main Composable
export function useDragAndDrop() {
  const activityStore = useActivityStore();
  const isDragging = ref(false);

  let draggedItem: HTMLElement | null = null;
  let isResizingActivity = false;
  let isResizingBorder = false;
  let draggedActivityIndex: number | null = null;
  let draggedBorderIndex: number | null = null;

  let initialStartTime = 0;
  let initialDuration = 0;

  let activity_orig_screen_y = 0;
  let mouse_orig_screen_y = 0;
  let border_orig_screen_y = 0;
  let border_prev_screen_y = 0;

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
    mouse_orig_screen_y =
      (e as MouseEvent).clientY ||
      ((e as TouchEvent).touches && (e as TouchEvent).touches[0].clientY) ||
      0;

    if (isBorder) {
      startBorderDrag(index);
    } else {
      startActivityDrag(item, index);
    }
    border_prev_screen_y = border_orig_screen_y;
    activity_orig_screen_y = border_orig_screen_y - initialDuration;
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
    initialDuration =
      activityStore.getActivitiesForDay[draggedBorderIndex].duration_minutes;
    initialStartTime =
      activityStore.getActivitiesForDay[draggedBorderIndex].start_time_minutes;

    border_orig_screen_y = borderElement.getBoundingClientRect().top;
  };

  /**
   * Handles the start of activity dragging.
   */
  const startActivityDrag = (item: Element, index: number) => {
    draggedActivityIndex = index;
    (item as HTMLElement).style.cursor = "ns-resize";
    initialStartTime =
      activityStore.getActivitiesForDay[draggedActivityIndex].start_time_minutes;
    initialDuration =
      activityStore.getActivitiesForDay[draggedActivityIndex].duration_minutes;
    isResizingActivity = true;
    isResizingBorder = false;

    const timeMarkers = document.querySelector(".time-markers");
    border_orig_screen_y =
      timeMarkers?.getBoundingClientRect().top +
      initialStartTime +
      initialDuration;
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

    const timeMarkers = document.querySelector(".time-markers");
    const timeMarkersRect = timeMarkers?.getBoundingClientRect();

    let border_curr_screen_y = border_orig_screen_y;
    if (timeMarkersRect && isMouseInTimeMarkers(e, timeMarkersRect)) {
      border_curr_screen_y = calculateSnappedY(
        mouse_curr_screen_y,
        timeMarkersRect,
      );
    } else {
      border_curr_screen_y += mouse_curr_screen_y - mouse_orig_screen_y;
    }

    if (isResizingActivity && draggedActivityIndex !== null) {
      const diffY = border_curr_screen_y - border_orig_screen_y;
      handleActivityResize(diffY, draggedActivityIndex);
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
      if (isResizingActivity && draggedActivityIndex !== null) {
        endActivityDrag();
      } else if (isResizingBorder && draggedBorderIndex !== null) {
        endBorderDrag();
      }

      draggedItem.style.cursor = "move";
      draggedItem = null;
      isResizingActivity = false;
      isResizingBorder = false;
      draggedActivityIndex = null;
      draggedBorderIndex = null;
    }
  };

  /**
   * Handles the end of activity dragging.
   */
  const endActivityDrag = () => {
    const activity = activityStore.getActivitiesForDay[draggedActivityIndex!];
    activityStore.updateActivity(activity.id, {
      duration_minutes: activity.duration_minutes,
    });
  };

  /**
   * Handles the end of border dragging.
   */
  const endBorderDrag = () => {
    const activityA = activityStore.getActivitiesForDay[draggedBorderIndex!];
    const activityB =
      activityStore.getActivitiesForDay[draggedBorderIndex! + 1];
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
  function handleActivityResize(diffY: number, draggedActivityIndex: number) {
    const currentActivity =
      activityStore.getActivitiesForDay[draggedActivityIndex];
    const newDuration = initialDuration + diffY;

    if (newDuration > 0) {
      activityStore.updateActivity(currentActivity.id, {
        duration_minutes: newDuration,
      });
      updateActivityElementStyle(draggedActivityIndex, {
        height: newDuration,
      });

      for (
        let i = draggedActivityIndex + 1;
        i < activityStore.getActivitiesForDay.length;
        i++
      ) {
        const prevActivity = activityStore.getActivitiesForDay[i - 1];
        const newStartTime = prevActivity.start_time_minutes + prevActivity.duration_minutes;
        activityStore.updateActivity(activityStore.getActivitiesForDay[i].id, {
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
    if (
      draggedBorderIndex < 0 ||
      draggedBorderIndex >= activityStore.getActivitiesForDay.length - 1
    ) {
      return;
    }

    const activityA = activityStore.getActivitiesForDay[draggedBorderIndex];
    const activityB = activityStore.getActivitiesForDay[draggedBorderIndex + 1];

    const diffY = border_curr_screen_y - border_prev_screen_y;
    const newDurationA = activityA.duration_minutes + diffY;
    const newDurationB = activityB.duration_minutes - diffY;

    if (newDurationA > 0 && newDurationB > 0) {
      // Update durations and start time
      activityStore.updateActivity(activityA.id, { duration_minutes: newDurationA });
      activityStore.updateActivity(activityB.id, {
        start_time_minutes: activityA.start_time_minutes + activityA.duration_minutes,
        duration_minutes: newDurationB,
      });

      // Update element styles
      updateActivityElementStyle(draggedBorderIndex, {
        height: activityA.duration_minutes,
      });
      updateActivityElementStyle(draggedBorderIndex + 1, {
        top: activityA.start_time_minutes + activityA.duration_minutes,
        height: activityB.duration_minutes,
      });

      border_prev_screen_y = border_curr_screen_y;
    }
  }

  // --- Event Listeners ---

  onMounted(() => {
    nextTick(() => {
      const activityItems = document.querySelectorAll(".activity-item");
      const activityBorders = document.querySelectorAll(".activity-border");

      activityItems.forEach((item, index) => {
        item.addEventListener("mousedown", (e) =>
          startDrag(e, item, index, false),
        );
        item.addEventListener(
          "touchstart",
          (e) => {
            startDrag(e, item, index, false);
          },
          { passive: true },
        );
      });

      activityBorders.forEach((border, index) => {
        border.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          startDrag(e, border, index, true);
        });
        border.addEventListener(
          "touchstart",
          (e) => {
            e.stopPropagation();
            startDrag(e, border, index, true);
          },
          { passive: true },
        );
      });

      window.addEventListener("mousemove", moveDrag);
      window.addEventListener("touchmove", moveDrag, { passive: true });
      window.addEventListener("mouseup", endDrag);
      window.addEventListener("touchend", endDrag);

      for (let i = 0; i < activityStore.getActivitiesForDay.length; i++) {
        updateActivityElementStyle(i, {
          top: activityStore.getActivitiesForDay[i].start_time_minutes,
          height: activityStore.getActivitiesForDay[i].duration_minutes,
        });
      }
    });
  });

  onUnmounted(() => {
    window.removeEventListener("mousemove", moveDrag);
    window.removeEventListener("touchmove", moveDrag);
    window.removeEventListener("mouseup", endDrag);
    window.removeEventListener("touchend", endDrag);
  });

  return { startDrag, moveDrag, endDrag };
}
