<template>
  <div class="day-view">
    <h1 ref="dayHeadingRef" tabindex="-1">Day View</h1>
    <CapturePanel v-model:selected-tag-ids="selectedTagIds" :now-ms="nowMs" />
    <TodayReceipt :receipt="todayReceipt" />
    <p class="timeline-help" role="status">
      <template v-if="pendingBoundaryMinute !== null">
        Boundary at {{ formatMinute(pendingBoundaryMinute) }}.
        <template v-if="canInsertActivity">
          Tap another time on the margin, or tap the filled/unfilled slot above
          or below the line.
        </template>
        <template v-else>
          Select tags above, then choose the other side.
        </template>
        <button type="button" class="cancel-creation" @click="cancelCreation">
          Cancel
        </button>
      </template>
      <template v-else>
        Tap the time margin to choose a boundary. Tap filled or unfilled time to
        edit its tags; drag an activity to move its trailing boundary.
      </template>
    </p>
    <div
      ref="timeAxisAreaRef"
      class="time-axis-area"
      title="Choose an activity boundary"
      @click="handleTimeAxisAreaClick"
    >
      <div
        v-if="pendingBoundaryMinute !== null"
        class="creation-boundary-axis"
        :style="{ top: pendingBoundaryMinute + 'px' }"
      ></div>
      <div
        v-for="hour in hours"
        :key="hour"
        class="time-axis-mark"
        :style="{ top: hour * 60 + 'px' }"
      >
        <span class="time-text">{{
          useTimeFormatter(hour).formattedTime
        }}</span>
        <span class="tick-mark"></span>
      </div>
    </div>
    <div class="activity-list">
      <button
        v-for="gap in unfilledSlots"
        :key="`${gap.start}-${gap.end}`"
        type="button"
        class="timeline-gap"
        :class="{ selectable: pendingBoundaryMinute !== null }"
        :data-gap-start="gap.start"
        :data-gap-end="gap.end"
        :style="{
          top: gap.start + 'px',
          height: gap.end - gap.start + 'px',
        }"
        :title="
          pendingBoundaryMinute === null
            ? 'Tap to set tags; drag to adjust the end of this unfilled time'
            : 'Use this side of the pending boundary'
        "
        @click="handleSlotClick(gap.start, gap.end, $event)"
      >
        <span v-if="gap.end - gap.start >= 30">Unfilled</span>
      </button>
      <ActivityItem
        v-for="activity in activities"
        :key="activity.id"
        :activity="activity"
        :title="activityStore.titleForSelection(activity.tagIds)"
        class="activity-item"
        :style="{
          top: activity.start_time_minutes + 'px',
          height: activity.duration_minutes + 'px',
        }"
        @edit="handleActivityTap"
      />
      <div
        v-if="pendingBoundaryMinute !== null"
        class="creation-boundary"
        :style="{ top: pendingBoundaryMinute + 'px' }"
      ></div>
    </div>
    <ActivityTagEditor
      v-if="editingActivity"
      :key="`activity-${editingActivity.id}`"
      :activity="editingActivity"
      @close="closeTimelineEditor"
    />
    <ActivityTagEditor
      v-else-if="editingGap"
      :key="`gap-${editingGap.date}-${editingGap.start}-${editingGap.end}`"
      :gap="editingGap"
      :initial-tag-ids="selectedTagIds"
      @close="closeTimelineEditor"
    />
  </div>
</template>

<script lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useDragAndDrop } from "../composable/useDragAndDrop";
import { useTimeFormatter } from "../composable/useTimeFormatter";
import { buildTodayReceipt } from "../function/buildTodayReceipt";
import { getLocalDayAtMs } from "../function/localCalendar";
import { isValidSelection, normalizeSelection } from "../function/tagSelection";
import { useActivityStore } from "../store/activity";
import ActivityItem from "../component/ActivityItem.vue";
import ActivityTagEditor from "../component/ActivityTagEditor.vue";
import CapturePanel from "../component/CapturePanel.vue";
import TodayReceipt from "../component/TodayReceipt.vue";

export default {
  name: "DayView",
  components: {
    ActivityItem,
    ActivityTagEditor,
    CapturePanel,
    TodayReceipt,
  },
  setup() {
    const activityStore = useActivityStore();
    const nowMs = ref(Date.now());
    const currentDate = computed(() => getLocalDayAtMs(nowMs.value));
    activityStore.reconcileRunning(nowMs.value);
    const selectedTagIds = ref(
      normalizeSelection(
        activityStore.runningActivity?.tagIds ??
          activityStore.recentTagSelections[0] ??
          [],
        activityStore.tagGroups,
      ),
    );
    const canInsertActivity = computed(() =>
      isValidSelection(selectedTagIds.value, activityStore.tagGroups, true),
    );
    const activities = computed(() =>
      activityStore.getActivitiesForDay(currentDate.value),
    );
    const unfilledSlots = computed(() => {
      const gaps: Array<{ start: number; end: number }> = [];
      let cursor = 0;
      for (const activity of activities.value) {
        const start = Math.max(0, Math.min(1440, activity.start_time_minutes));
        const end = Math.max(
          start,
          Math.min(1440, start + activity.duration_minutes),
        );
        if (start > cursor) gaps.push({ start: cursor, end: start });
        cursor = Math.max(cursor, end);
      }
      if (cursor < 1440) gaps.push({ start: cursor, end: 1440 });
      return gaps;
    });
    const pendingBoundaryMinute = ref<number | null>(null);
    const editingActivityId = ref<number | null>(null);
    const editingGap = ref<{
      start: number;
      end: number;
      date: string;
    } | null>(null);
    const dayHeadingRef = ref<HTMLElement | null>(null);
    const timeAxisAreaRef = ref<HTMLElement | null>(null);
    let editorTrigger: HTMLElement | null = null;

    function clientYToMinute(clientY: number, snap: boolean) {
      const axis = timeAxisAreaRef.value;
      if (!axis) return null;
      const rect = axis.getBoundingClientRect();
      if (rect.height <= 0) return null;
      const rawMinute = ((clientY - rect.top) / rect.height) * 1440;
      const minute = snap ? Math.round(rawMinute / 15) * 15 : rawMinute;
      return Math.max(0, Math.min(1440, minute));
    }

    function completeInterval(start: number, end: number) {
      if (
        !canInsertActivity.value ||
        !activityStore.replaceActivityInterval(
          start,
          end,
          currentDate.value,
          selectedTagIds.value,
        )
      )
        return;
      pendingBoundaryMinute.value = null;
    }

    function handleTimeAxisAreaClick(event: MouseEvent) {
      const minute = clientYToMinute(event.clientY, true);
      if (minute === null) return;
      if (pendingBoundaryMinute.value === null) {
        pendingBoundaryMinute.value = minute;
        return;
      }
      completeInterval(
        Math.min(pendingBoundaryMinute.value, minute),
        Math.max(pendingBoundaryMinute.value, minute),
      );
    }

    function completeFromSlot(
      slotStart: number,
      slotEnd: number,
      clickedMinute: number,
    ) {
      const boundary = pendingBoundaryMinute.value;
      if (boundary === null || boundary < slotStart || boundary > slotEnd)
        return;
      if (boundary === slotEnd || clickedMinute < boundary) {
        completeInterval(slotStart, boundary);
      } else {
        completeInterval(boundary, slotEnd);
      }
    }

    function handleGapTap(
      slotStart: number,
      slotEnd: number,
      clientY?: number,
      trigger?: HTMLElement,
    ) {
      if (pendingBoundaryMinute.value === null) {
        editorTrigger = trigger ?? null;
        editingGap.value = {
          start: slotStart,
          end: slotEnd,
          date: currentDate.value,
        };
        return;
      }
      const clickedMinute =
        clientY === undefined
          ? pendingBoundaryMinute.value === slotEnd
            ? slotEnd - 1
            : pendingBoundaryMinute.value + 1
          : clientYToMinute(clientY, false);
      if (clickedMinute !== null)
        completeFromSlot(slotStart, slotEnd, clickedMinute);
    }

    function handleSlotClick(
      slotStart: number,
      slotEnd: number,
      event: MouseEvent,
    ) {
      if (event.detail !== 0) return;
      handleGapTap(
        slotStart,
        slotEnd,
        undefined,
        event.currentTarget as HTMLElement,
      );
    }

    function cancelCreation() {
      pendingBoundaryMinute.value = null;
    }

    function formatMinute(minute: number) {
      const bounded = Math.max(0, Math.min(1440, minute));
      const hours = Math.floor(bounded / 60);
      const minutes = Math.round(bounded % 60);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    function openActivityEditor(activityId: number) {
      const activity = activityStore.activities.find(
        (candidate) => candidate.id === activityId,
      );
      if (!activity) return;
      editorTrigger = document.querySelector(
        `[data-activity-id="${activityId}"]`,
      );
      editingGap.value = null;
      editingActivityId.value = activityId;
    }

    function handleActivityTap(activityId: number, clientY?: number) {
      if (pendingBoundaryMinute.value === null) {
        openActivityEditor(activityId);
        return;
      }
      const activity = activityStore.activities.find(
        (candidate) => candidate.id === activityId,
      );
      if (!activity) return;
      const start = activity.start_time_minutes;
      const end = start + activity.duration_minutes;
      const clickedMinute =
        clientY === undefined
          ? pendingBoundaryMinute.value === end
            ? end - 1
            : pendingBoundaryMinute.value + 1
          : clientYToMinute(clientY, false);
      if (clickedMinute !== null) completeFromSlot(start, end, clickedMinute);
    }

    async function closeTimelineEditor() {
      editingActivityId.value = null;
      editingGap.value = null;
      await nextTick();
      if (editorTrigger?.isConnected) editorTrigger.focus();
      else dayHeadingRef.value?.focus();
      editorTrigger = null;
    }

    useDragAndDrop(currentDate, handleActivityTap, handleGapTap);

    const editingActivity = computed(
      () =>
        activityStore.activities.find(
          (activity) => activity.id === editingActivityId.value,
        ) ?? null,
    );
    const todayReceipt = computed(() =>
      buildTodayReceipt({
        activities: activities.value,
        runningActivity: activityStore.runningActivity,
        tagGroups: activityStore.tagGroups,
        day: currentDate.value,
        nowMs: nowMs.value,
      }),
    );
    const hours = Array.from({ length: 25 }, (_, index) => index);
    let reconcileTimer: ReturnType<typeof setInterval> | undefined;
    const updateNowAndReconcile = () => {
      nowMs.value = Date.now();
      activityStore.reconcileRunning(nowMs.value);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pendingBoundaryMinute.value !== null) {
        cancelCreation();
      }
    };
    onMounted(() => {
      reconcileTimer = setInterval(updateNowAndReconcile, 1000);
      window.addEventListener("keydown", handleKeyDown);
    });
    onUnmounted(() => {
      if (reconcileTimer !== undefined) clearInterval(reconcileTimer);
      window.removeEventListener("keydown", handleKeyDown);
    });
    return {
      activityStore,
      activities,
      unfilledSlots,
      hours,
      useTimeFormatter,
      timeAxisAreaRef,
      nowMs,
      currentDate,
      todayReceipt,
      editingActivity,
      editingGap,
      dayHeadingRef,
      selectedTagIds,
      canInsertActivity,
      pendingBoundaryMinute,
      handleTimeAxisAreaClick,
      handleSlotClick,
      handleActivityTap,
      cancelCreation,
      formatMinute,
      closeTimelineEditor,
    };
  },
};
</script>

<style scoped>
.day-view {
  box-sizing: border-box;
  padding: 20px;
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr);
  max-width: 1200px;
  width: 100%;
}
.day-view h1 {
  margin-bottom: 10px;
  grid-column: 1 / 3;
}
.timeline-help {
  grid-column: 1 / 3;
  margin: 0 0 10px;
  color: var(--color-muted);
  font-size: 0.85rem;
}
.cancel-creation {
  min-height: 32px;
  margin-left: 8px;
}
.time-axis-area {
  position: relative;
  margin-right: 10px;
  cursor: pointer;
}
.creation-boundary-axis {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-current);
  pointer-events: none;
}
.time-axis-mark {
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
  height: 1px;
}
.time-text {
  font-size: 0.8em;
  white-space: nowrap;
  margin-right: 5px;
}
.tick-mark {
  width: 5px;
  height: 1px;
  background-color: var(--color-axis);
}
.activity-list {
  position: relative;
  border: 1px solid var(--color-border);
  min-height: 1440px;
  margin-top: 0;
  min-width: 0;
}
.timeline-gap {
  box-sizing: border-box;
  position: absolute;
  left: 0;
  right: 0;
  padding: 8px 10px;
  border: 1px dashed var(--color-border);
  border-radius: 0;
  color: var(--color-muted);
  background: var(--color-surface-muted);
  text-align: left;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}
.timeline-gap {
  cursor: pointer;
}
.timeline-gap.selectable {
  z-index: 2;
}
.timeline-gap.selectable:hover {
  border-color: var(--color-current);
}
.creation-boundary {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-current);
  pointer-events: none;
}
</style>
