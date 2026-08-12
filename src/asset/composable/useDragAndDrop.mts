import { onMounted } from "vue";
import { useActivityStore } from "../store/activityStore";

export function useDragAndDrop() {
  const activityStore = useActivityStore();

  onMounted(() => {
    let draggedItem: HTMLElement | null = null;
    let initialY = 0;
    let isResizingActivity = false;
    let isResizingBorder = false;
    let draggedActivityIndex: number | null = null;
    let draggedBorderIndex: number | null = null;
    let initialStartTime = 0;
    let initialDuration = 0;

    const activityItems = document.querySelectorAll(".activity-item");
    const activityBorders = document.querySelectorAll(".activity-border");
    const timeMarkers = document.querySelector(".time-markers");

    const startDrag = (
      e: MouseEvent | TouchEvent,
      item: Element,
      index: number,
      isBorder: boolean,
    ) => {
      e.preventDefault();
      draggedItem = item as HTMLElement;
      initialY =
        (e as MouseEvent).clientY ||
        ((e as TouchEvent).touches && (e as TouchEvent).touches[0].clientY) ||
        0;
      if (isBorder) {
        draggedBorderIndex = index;
        isResizingBorder = true;
        isResizingActivity = false;
        console.log("touchstart/mousedown on border", { index, initialY });
      } else {
        draggedActivityIndex = index;
        (item as HTMLElement).style.cursor = "ns-resize";
        initialStartTime =
          activityStore.getActivitiesForDay[draggedActivityIndex].startTime;
        initialDuration =
          activityStore.getActivitiesForDay[draggedActivityIndex].duration;
        isResizingActivity = true;
        isResizingBorder = false;
        console.log("touchstart/mousedown on activity", {
          index,
          height:
            activityStore.getActivitiesForDay[draggedActivityIndex].duration,
          initialY,
          initialStartTime,
          initialDuration,
        });
      }
    };

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
        e.stopPropagation(); // Stop event from bubbling to activity
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

    const moveDrag = (e: MouseEvent | TouchEvent) => {
      if (!draggedItem) return;

      let clientY =
        (e as MouseEvent).clientY ||
        ((e as TouchEvent).touches && (e as TouchEvent).touches[0].clientY);
      if (clientY === undefined) return;

      let diffY = clientY - initialY;
      let snappedY = clientY;
      let snappedEndTime: number | null = null;

      // Check if the mouse is within the time marker column
      if (timeMarkers) {
        const timeMarkersRect = timeMarkers.getBoundingClientRect();
        if (
          ((e as MouseEvent).clientX >= timeMarkersRect.left &&
            (e as MouseEvent).clientX <= timeMarkersRect.right) ||
          ((e as TouchEvent).touches &&
            (e as TouchEvent).touches[0].clientX >= timeMarkersRect.left &&
            (e as TouchEvent).touches[0].clientX <= timeMarkersRect.right)
        ) {
          // Calculate the nearest hour
          const hourHeight = 60;
          const offset = timeMarkersRect.top;
          const mouseY = clientY - offset;
          const nearestHour = Math.round(mouseY / hourHeight);
          snappedY = nearestHour * hourHeight + offset;
          diffY = snappedY - initialY;

          if (isResizingActivity && draggedActivityIndex !== null) {
            const currentActivity =
              activityStore.getActivitiesForDay[draggedActivityIndex];
            snappedEndTime = nearestHour * hourHeight;
          }
        }
      }

      if (isResizingActivity && draggedActivityIndex !== null) {
        handleActivityResize(
          diffY,
          draggedActivityIndex,
          activityItems,
          snappedY,
          snappedEndTime,
        );
      } else if (isResizingBorder && draggedBorderIndex !== null) {
        handleBorderDrag(diffY, draggedBorderIndex, activityItems, e, snappedY);
      }
    };

    window.addEventListener("mousemove", moveDrag);
    window.addEventListener("touchmove", moveDrag, { passive: true });

    function handleActivityResize(
      diffY: number,
      draggedActivityIndex: number,
      activityItems: NodeListOf<Element>,
      snappedY: number,
      snappedEndTime: number | null,
    ) {
      const currentActivity =
        activityStore.getActivitiesForDay[draggedActivityIndex];
      let newDuration = initialDuration + diffY;
      let newEndTime = currentActivity.startTime + newDuration;

      if (snappedEndTime !== null) {
        newEndTime = snappedEndTime;
        newDuration = newEndTime - currentActivity.startTime;
      }

      console.log("handleActivityResize before", {
        diffY,
        newDuration,
        initialDuration,
        currentActivity,
        snappedEndTime,
        newEndTime,
      });

      if (newDuration > 0) {
        // Adjust current activity
        activityStore.updateActivity(currentActivity.id, {
          duration: newDuration,
        });
        const activityElement = activityItems[
          draggedActivityIndex
        ] as HTMLElement;
        if (activityElement instanceof HTMLElement) {
          activityElement.style.height = `${newDuration}px`;
        }

        // Adjust subsequent activity positions
        for (
          let i = draggedActivityIndex + 1;
          i < activityStore.getActivitiesForDay.length;
          i++
        ) {
          const prevActivity = activityStore.getActivitiesForDay[i - 1];
          const newStartTime = prevActivity.startTime + prevActivity.duration;
          activityStore.updateActivity(
            activityStore.getActivitiesForDay[i].id,
            { startTime: newStartTime },
          );
          const activityElement = activityItems[i] as HTMLElement;
          if (activityElement instanceof HTMLElement) {
            activityElement.style.top = `${newStartTime}px`;
          }
        }
        console.log("handleActivityResize after", {
          diffY,
          newDuration,
          currentActivity,
        });
      } else {
        console.log("handleActivityResize: newDuration out of bounds", {
          newDuration,
          currentActivity,
        });
      }
    }

    function handleBorderDrag(
      diffY: number,
      draggedBorderIndex: number,
      activityItems: NodeListOf<Element>,
      e: MouseEvent | TouchEvent,
      snappedY: number,
    ) {
      if (
        draggedBorderIndex < 0 ||
        draggedBorderIndex >= activityStore.getActivitiesForDay.length - 1
      ) {
        console.log("handleBorderResize: draggedBorderIndex out of bounds");
        return;
      }
      const activityA = activityStore.getActivitiesForDay[draggedBorderIndex];
      const activityB =
        activityStore.getActivitiesForDay[draggedBorderIndex + 1];

      let newDurationA = activityA.duration + diffY;
      let newDurationB = activityB.duration - diffY;

      let snappedDiffY = snappedY - initialY;
      let snappedDurationA = activityA.duration + snappedDiffY;
      let snappedDurationB = activityB.duration - snappedDiffY;

      if (newDurationA > 0 && newDurationB > 0) {
        // Adjust activity properties
        activityStore.updateActivity(activityA.id, { duration: newDurationA });
        activityStore.updateActivity(activityB.id, {
          startTime: activityA.startTime + newDurationA,
          duration: newDurationB,
        });

        // Update visual elements
        const activityAElement = activityItems[
          draggedBorderIndex
        ] as HTMLElement;
        if (activityAElement instanceof HTMLElement) {
          activityAElement.style.height = `${newDurationA}px`;
        }

        const activityBElement = activityItems[
          draggedBorderIndex + 1
        ] as HTMLElement;
        if (activityBElement instanceof HTMLElement) {
          activityBElement.style.top = `${activityB.startTime}px`;
          activityBElement.style.height = `${newDurationB}px`;
        }

        // Adjust subsequent activities
        for (
          let i = draggedBorderIndex + 2;
          i < activityStore.getActivitiesForDay.length;
          i++
        ) {
          const prevActivity = activityStore.getActivitiesForDay[i - 1];
          const newStartTime = prevActivity.startTime + prevActivity.duration;
          activityStore.updateActivity(
            activityStore.getActivitiesForDay[i].id,
            { startTime: newStartTime },
          );
          const activityElement = activityItems[i] as HTMLElement;
          if (activityElement instanceof HTMLElement) {
            activityElement.style.top = `${newStartTime}px`;
          }
        }
      } else {
        // Handle cases where durations become invalid (e.g., zero or negative)
        console.log("handleBorderResize: newDuration out of bounds");
      }
      initialY = snappedY; // Reset initialY to current mouse position
    }

    const endDrag = () => {
      if (draggedItem) {
        if (isResizingActivity && draggedActivityIndex !== null) {
          updateActivityResize(draggedActivityIndex, activityItems);
        }
        draggedItem.style.cursor = "move";
        draggedItem = null;
        isResizingActivity = false;
        isResizingBorder = false;
        console.log("mouseup/touchend", {
          draggedActivityIndex,
          isResizingActivity,
          isResizingBorder,
        });
      }
    };

    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);

    function updateActivityResize(
      draggedActivityIndex: number,
      activityItems: NodeListOf<Element>,
    ) {
      const currentActivity =
        activityStore.getActivitiesForDay[draggedActivityIndex];
      let newDuration = currentActivity.duration;

      if (newDuration > 0) {
        // Adjust subsequent activities
        for (
          let i = draggedActivityIndex + 1;
          i < activityStore.getActivitiesForDay.length;
          i++
        ) {
          const prevActivity = activityStore.getActivitiesForDay[i - 1];
          const newStartTime = prevActivity.startTime + prevActivity.duration;
          activityStore.updateActivity(
            activityStore.getActivitiesForDay[i].id,
            { startTime: newStartTime },
          );
          const activityElement = activityItems[i] as HTMLElement;
          if (activityElement instanceof HTMLElement) {
            activityElement.style.top = `${newStartTime}px`;
          }
        }
        console.log("updateActivityResize", { newDuration, currentActivity });
      }
    }

    // Initial positioning of activities
    for (
      let i = 0;
      i < activityStore.getActivitiesForDay.length;
      i++
    ) {
      const activityElement = activityItems[i] as HTMLElement;
      if (activityElement instanceof HTMLElement) {
        activityElement.style.top = `${activityStore.getActivitiesForDay[i].startTime}px`;
        activityElement.style.height = `${activityStore.getActivitiesForDay[i].duration}px`;
      }
    }
  });

  return {};
}
