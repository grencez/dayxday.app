import { onMounted, onUnmounted, ref, nextTick, type Ref } from "vue";
import { useActivityStore } from "../store/activity";
import { calculateSnappedY } from "../function/calculateSnappedY";
import { isMouseInTimeAxisArea } from "../function/isMouseInTimeAxisArea";
import { updateActivityElementStyle } from "../function/updateActivityElementStyle";

const DRAG_THRESHOLD_PX = 6;

function pointerPosition(event: MouseEvent | TouchEvent) {
  if (event instanceof MouseEvent) {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event.touches[0] ?? event.changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

// Main Composable
export function useDragAndDrop(
  date: Ref<string>,
  onActivityTap?: (activityId: number, clientY: number) => void,
  onGapTap?: (
    start: number,
    end: number,
    clientY: number,
    trigger: HTMLElement,
  ) => void,
) {
  const activityStore = useActivityStore();
  const isDragging = ref(false);

  let draggedItem: HTMLElement | null = null;
  let draggedActivityId: number | null = null;
  let draggedBoundaryIndex: number | null = null;
  let draggedGapStart: number | null = null;
  let draggedGapEnd: number | null = null;
  let draggedGapNextId: number | null = null;
  let draggedGapNextIndex: number | null = null;
  let draggedDate: string | null = null;

  let initialStartTime = 0;
  let initialDurationA = 0;
  let initialNextStart = 0;
  let initialNextEnd = 0;
  let hasSharedNextBoundary = false;

  let pointerOriginY = 0;
  let exceededDragThreshold = false;
  let originalTimings: Array<{
    id: number;
    start_time_minutes: number;
    duration_minutes: number;
  }> = [];
  let border_orig_screen_y = 0;

  // --- Event Handlers ---

  function prepareDrag(e: MouseEvent | TouchEvent, item: Element) {
    const position = pointerPosition(e);
    if (!position) return false;
    isDragging.value = true;
    if (e.cancelable) e.preventDefault();
    draggedItem = item as HTMLElement;
    draggedDate = date.value;
    pointerOriginY = position.y;
    exceededDragThreshold = false;
    originalTimings = activityStore
      .getActivitiesForDay(draggedDate)
      .map(({ id, start_time_minutes, duration_minutes }) => ({
        id,
        start_time_minutes,
        duration_minutes,
      }));
    return true;
  }

  /** Initiates a trailing-boundary drag from an activity surface. */
  const startDrag = (
    e: MouseEvent | TouchEvent,
    item: Element,
    index: number,
  ) => {
    if (!prepareDrag(e, item)) return;
    draggedGapStart = null;
    draggedGapEnd = null;
    startBoundaryDrag(item, index);
  };

  /** Initiates the same trailing-boundary gesture from an Unfilled surface. */
  const startGapDrag = (
    e: MouseEvent | TouchEvent,
    item: Element,
    start: number,
    end: number,
  ) => {
    if (!prepareDrag(e, item)) return;
    const activities = activityStore.getActivitiesForDay(draggedDate!);
    const nextIndex = activities.findIndex(
      (activity) => activity.start_time_minutes === end,
    );
    const nextActivity = activities[nextIndex];
    draggedActivityId = null;
    draggedBoundaryIndex = null;
    draggedGapStart = start;
    draggedGapEnd = end;
    draggedGapNextId = nextActivity?.id ?? null;
    draggedGapNextIndex = nextIndex >= 0 ? nextIndex : null;
    initialNextEnd = nextActivity
      ? nextActivity.start_time_minutes + nextActivity.duration_minutes
      : end;
    (item as HTMLElement).style.cursor = nextActivity ? "ns-resize" : "pointer";
    const timeAxisArea = document.querySelector(".time-axis-area");
    border_orig_screen_y = timeAxisArea?.getBoundingClientRect().top + end;
  };

  /** The deliberately broad activity surface manipulates its trailing boundary. */
  const startBoundaryDrag = (item: Element, index: number) => {
    const activities = activityStore.getActivitiesForDay(draggedDate!);
    const activity = activities[index];
    if (!activity) return;
    const nextActivity = activities[index + 1];

    draggedBoundaryIndex = index;
    draggedActivityId = activity.id;
    (item as HTMLElement).style.cursor = "ns-resize";
    initialStartTime = activity.start_time_minutes;
    initialDurationA = activity.duration_minutes;
    initialNextStart = nextActivity?.start_time_minutes ?? 1440;
    initialNextEnd = nextActivity
      ? nextActivity.start_time_minutes + nextActivity.duration_minutes
      : 1440;
    hasSharedNextBoundary =
      nextActivity !== undefined &&
      initialNextStart === initialStartTime + initialDurationA;

    const timeAxisArea = document.querySelector(".time-axis-area");
    border_orig_screen_y =
      timeAxisArea?.getBoundingClientRect().top +
      initialStartTime +
      initialDurationA;
  };

  /**
   * Handles the drag movement.
   */
  const moveDrag = (e: MouseEvent | TouchEvent) => {
    if (!draggedItem || !isDragging.value) return;

    const position = pointerPosition(e);
    if (!position) return;
    if (!exceededDragThreshold) {
      if (Math.abs(position.y - pointerOriginY) < DRAG_THRESHOLD_PX) return;
      exceededDragThreshold = true;
    }
    if (e.cancelable) e.preventDefault();
    const mouse_curr_screen_y = position.y;

    const time_axis_area = document.querySelector(".time-axis-area");
    const time_axis_area_rect = time_axis_area?.getBoundingClientRect();

    let border_curr_screen_y = border_orig_screen_y;
    if (time_axis_area_rect && isMouseInTimeAxisArea(e, time_axis_area_rect)) {
      border_curr_screen_y = calculateSnappedY(
        mouse_curr_screen_y,
        time_axis_area_rect,
      );
    } else {
      border_curr_screen_y += mouse_curr_screen_y - pointerOriginY;
    }

    if (draggedBoundaryIndex !== null) {
      handleBoundaryDrag(border_curr_screen_y, draggedBoundaryIndex);
    } else if (draggedGapStart !== null && draggedGapEnd !== null) {
      handleGapBoundaryDrag(border_curr_screen_y);
    }
  };

  /**
   * Handles the end of the dragging process.
   */
  const finishDrag = (allowTap: boolean) => {
    if (!isDragging.value) return;

    isDragging.value = false;

    if (draggedItem) {
      const tappedActivityId =
        allowTap && !exceededDragThreshold ? draggedActivityId : null;
      const tappedGap =
        allowTap &&
        !exceededDragThreshold &&
        draggedGapStart !== null &&
        draggedGapEnd !== null
          ? {
              start: draggedGapStart,
              end: draggedGapEnd,
              trigger: draggedItem,
            }
          : null;
      if (!allowTap && exceededDragThreshold) rollbackDrag();

      draggedItem.style.cursor = draggedGapStart === null ? "move" : "pointer";
      draggedItem = null;
      draggedActivityId = null;
      draggedBoundaryIndex = null;
      draggedGapStart = null;
      draggedGapEnd = null;
      draggedGapNextId = null;
      draggedGapNextIndex = null;
      draggedDate = null;
      exceededDragThreshold = false;
      originalTimings = [];
      if (tappedActivityId !== null)
        onActivityTap?.(tappedActivityId, pointerOriginY);
      else if (tappedGap)
        onGapTap?.(
          tappedGap.start,
          tappedGap.end,
          pointerOriginY,
          tappedGap.trigger,
        );
    }
  };

  const endDrag = () => finishDrag(true);
  const cancelDrag = () => finishDrag(false);

  function rollbackDrag() {
    for (const timing of originalTimings) {
      activityStore.updateActivity(timing.id, {
        start_time_minutes: timing.start_time_minutes,
        duration_minutes: timing.duration_minutes,
      });
    }
    originalTimings.forEach((timing, index) =>
      updateActivityElementStyle(index, {
        top: timing.start_time_minutes,
        height: timing.duration_minutes,
      }),
    );
  }

  // --- Boundary resizing logic ---

  function handleBoundaryDrag(
    borderCurrentScreenY: number,
    boundaryIndex: number,
  ) {
    const activities = activityStore.getActivitiesForDay(draggedDate!);
    const activity = activities[boundaryIndex];
    if (!activity) return;
    const nextActivity = activities[boundaryIndex + 1];
    const diffY = borderCurrentScreenY - border_orig_screen_y;
    const boundary = initialStartTime + initialDurationA + diffY;
    if (boundary <= initialStartTime) return;

    if (hasSharedNextBoundary && nextActivity) {
      if (boundary >= initialNextEnd) return;
      const nextDuration = initialNextEnd - boundary;
      activityStore.updateActivity(activity.id, {
        duration_minutes: boundary - initialStartTime,
      });
      activityStore.updateActivity(nextActivity.id, {
        start_time_minutes: boundary,
        duration_minutes: nextDuration,
      });
      updateActivityElementStyle(boundaryIndex, {
        height: boundary - initialStartTime,
      });
      updateActivityElementStyle(boundaryIndex + 1, {
        top: boundary,
        height: nextDuration,
      });
      return;
    }

    // A gap is not a shared boundary: resize only this activity and stop at
    // the next activity. The final activity may extend only to midnight.
    const maximumEnd = nextActivity ? initialNextStart : 1440;
    if (boundary > maximumEnd) return;
    activityStore.updateActivity(activity.id, {
      duration_minutes: boundary - initialStartTime,
    });
    updateActivityElementStyle(boundaryIndex, {
      height: boundary - initialStartTime,
    });
  }

  function handleGapBoundaryDrag(borderCurrentScreenY: number) {
    if (
      draggedGapStart === null ||
      draggedGapEnd === null ||
      draggedGapNextId === null ||
      draggedGapNextIndex === null
    )
      return;
    const diffY = borderCurrentScreenY - border_orig_screen_y;
    const boundary = draggedGapEnd + diffY;
    if (boundary < draggedGapStart || boundary >= initialNextEnd) return;
    const nextDuration = initialNextEnd - boundary;
    activityStore.updateActivity(draggedGapNextId, {
      start_time_minutes: boundary,
      duration_minutes: nextDuration,
    });
    updateActivityElementStyle(draggedGapNextIndex, {
      top: boundary,
      height: nextDuration,
    });
  }

  // --- Event Listeners ---

  onMounted(() => {
    nextTick(() => {
      const activityList = document.querySelector(".activity-list");
      if (activityList) {
        activityList.addEventListener("mousedown", handleMouseDown);
        activityList.addEventListener("touchstart", handleTouchStart, {
          passive: false,
        });
      }

      window.addEventListener("mousemove", moveDrag);
      window.addEventListener("touchmove", moveDrag, { passive: false });
      window.addEventListener("mouseup", endDrag);
      window.addEventListener("touchend", endDrag);
      window.addEventListener("touchcancel", cancelDrag);

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
    window.removeEventListener("touchcancel", cancelDrag);
  });

  function handleMouseDown(e: MouseEvent) {
    handlePointerStart(e);
  }

  function handleTouchStart(e: TouchEvent) {
    handlePointerStart(e);
  }

  function handlePointerStart(e: MouseEvent | TouchEvent) {
    const target = e.target as HTMLElement;
    const activities = activityStore.getActivitiesForDay(date.value);
    const activityElement = target.closest<HTMLElement>(".activity-item");
    if (activityElement) {
      const activityId = Number(activityElement.dataset.activityId);
      const index = activities.findIndex((a) => a.id === activityId);
      if (index !== -1) startDrag(e, activityElement, index);
      return;
    }
    const gapElement = target.closest<HTMLElement>(".timeline-gap");
    if (!gapElement) return;
    const start = Number(gapElement.dataset.gapStart);
    const end = Number(gapElement.dataset.gapEnd);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      startGapDrag(e, gapElement, start, end);
    }
  }

  return { startDrag, startGapDrag, moveDrag, endDrag };
}
