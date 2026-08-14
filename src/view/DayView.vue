<template>
  <div class="day-view">
    <h1>Day View</h1>
    <CapturePanel :now-ms="nowMs" />
    <div
      ref="timeAxisAreaRef"
      class="time-axis-area"
      @click="handleTimeAxisAreaClick"
    >
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
      <p v-if="activities.length === 0" class="empty-state">
        <template v-if="activityStore.runningActivity">
          Your current activity will appear here when it ends.
        </template>
        <template v-else>
          Start an activity above, or tap the timeline on the left to
          reconstruct past time.
        </template>
      </p>
      <template v-for="(activity, index) in activities" :key="activity.id">
        <ActivityItem
          :activity="activity"
          class="activity-item"
          :style="{
            top: activity.start_time_minutes + 'px',
            height: activity.duration_minutes + 'px',
          }"
          @rename="handleRename"
        />
        <div
          v-if="index < activities.length - 1"
          class="activity-border"
          :data-border-index="index"
          :style="{
            top:
              activity.start_time_minutes +
              activity.duration_minutes -
              5 +
              'px',
          }"
        ></div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { useDragAndDrop } from "../composable/useDragAndDrop";
import { useActivityStore } from "../store/activity";
import { ref, computed, onMounted, onUnmounted } from "vue";
import ActivityItem from "../component/ActivityItem.vue";
import CapturePanel from "../component/CapturePanel.vue";
import { useTimeFormatter } from "../composable/useTimeFormatter";
import {
  getLocalDayAtMs,
  getLocalMinuteOfDay,
} from "../function/localCalendar";

export default {
  name: "DayView",
  components: {
    ActivityItem,
    CapturePanel,
  },
  setup() {
    const activityStore = useActivityStore();
    const nowMs = ref(Date.now());
    const currentDate = computed(() => getLocalDayAtMs(nowMs.value));

    activityStore.reconcileRunning(nowMs.value);
    useDragAndDrop(currentDate);

    const activities = computed(() =>
      activityStore.getActivitiesForDay(currentDate.value),
    );

    const timeAxisAreaRef = ref<HTMLElement | null>(null);

    const handleRename = (payload: { id: number; name: string }) => {
      activityStore.updateActivity(payload.id, { name: payload.name });
    };

    // Include 24 to show the final 00:00
    const hours = Array.from({ length: 25 }, (_, i) => i);

    let reconcileTimer: ReturnType<typeof setInterval> | undefined;
    const updateNowAndReconcile = () => {
      nowMs.value = Date.now();
      activityStore.reconcileRunning(nowMs.value);
    };

    onMounted(() => {
      reconcileTimer = setInterval(updateNowAndReconcile, 1000);
    });

    onUnmounted(() => {
      if (reconcileTimer !== undefined) clearInterval(reconcileTimer);
    });

    const handleTimeAxisAreaClick = (event: MouseEvent) => {
      if (!timeAxisAreaRef.value) {
        return;
      }
      const rect = timeAxisAreaRef.value.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const timeInMinutes = Math.round((y / rect.height) * 1440);
      activityStore.insertActivityAtTime(
        timeInMinutes,
        currentDate.value,
        { name: "New Activity" },
        Math.min(1440, getLocalMinuteOfDay(new Date(nowMs.value))),
      );
    };

    return {
      activityStore,
      activities,
      hours,
      useTimeFormatter,
      handleTimeAxisAreaClick,
      timeAxisAreaRef,
      handleRename,
      nowMs,
      currentDate,
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
  grid-column: 1 / 3; /* Span the title across both columns */
}

.time-axis-area {
  position: relative; /* Make this relative */
  margin-right: 10px;
  cursor: pointer;
}

.time-axis-mark {
  position: absolute; /* Position absolutely within time-markers */
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
  background-color: #000;
}

.activity-list {
  position: relative; /* Make this relative */
  border: 1px solid #ccc;
  min-height: 1440px;
  margin-top: 0px;
  min-width: 0;
}

.empty-state {
  margin: 16px;
  color: #666;
  line-height: 1.4;
  pointer-events: none;
}

.activity-border {
  position: absolute;
  left: 0;
  right: 0;
  height: 10px;
  cursor: ns-resize;
  background-color: rgba(0, 0, 0, 0.1);
  touch-action: none; /* Disable touch actions to prevent context menu */
}
</style>
