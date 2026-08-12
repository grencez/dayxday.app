import { onMounted, onUnmounted, ref, nextTick } from "vue";
import { useActivityStore } from "../store/activityStore";
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
      activityStore.getActivitiesForDay[draggedBorderIndex].duration;
    initialStartTime =
      initialDuration +
      activityStore.getActivitiesForDay[draggedBorderIndex].startTime;

    border_orig_screen_y = borderElement.getBoundingClientRect().top;
  };

  /**
   * Handles the start of activity dragging.
   */
  const startActivityDrag = (item: Element, index: number) => {
    draggedActivityIndex = index;
    (item as HTMLElement).style.cursor = "ns-resize";
    initialStartTime =
      activityStore.getActivitiesForDay[draggedActivityIndex].startTime;
    initialDuration =
      activityStore.getActivitiesForDay[draggedActivityIndex].duration;
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

    let mouse_curr_screen_y =
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
      handleBorderDrag(border_curr_screen_y, draggedBorderIndex, e);
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
      duration: activity.duration,
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
      duration: activityA.duration,
    });
    activityStore.updateActivity(activityB.id, {
      startTime: activityB.startTime,
      duration: activityB.duration,
    });
  };

  // --- Resizing and Dragging Logic ---

  /**
   * Handles the resizing of an activity.
   */
  function handleActivityResize(diffY: number, draggedActivityIndex: number) {
    const currentActivity =
      activityStore.getActivitiesForDay[draggedActivityIndex];
    let newDuration = initialDuration + diffY;

    if (newDuration > 0) {
      activityStore.updateActivity(currentActivity.id, {
        duration: newDuration,
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
        const newStartTime = prevActivity.startTime + prevActivity.duration;
        activityStore.updateActivity(activityStore.getActivitiesForDay[i].id, {
          startTime: newStartTime,
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
    e: MouseEvent | TouchEvent,
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
    const newDurationA = activityA.duration + diffY;
    const newDurationB = activityB.duration - diffY;

    if (newDurationA > 0 && newDurationB > 0) {
      // Update durations and start time
      activityStore.updateActivity(activityA.id, { duration: newDurationA });
      activityStore.updateActivity(activityB.id, {
        startTime: activityA.startTime + activityA.duration,
        duration: newDurationB,
      });

      // Update element styles
      updateActivityElementStyle(draggedBorderIndex, {
        height: activityA.duration,
      });
      updateActivityElementStyle(draggedBorderIndex + 1, {
        top: activityA.startTime + activityA.duration,
        height: activityB.duration,
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
          top: activityStore.getActivitiesForDay[i].startTime,
          height: activityStore.getActivitiesForDay[i].duration,
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
