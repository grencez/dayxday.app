<template>
  <div class="day-view">
    <h1>Day View</h1>
    <CapturePanel :now-ms="nowMs" />
    <TodayReceipt :receipt="todayReceipt" />
    <div ref="timeAxisAreaRef" class="time-axis-area">
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
          Select at least one tag above to start tracking.
        </template>
      </p>
      <template v-for="(activity, index) in activities" :key="activity.id">
        <ActivityItem
          :activity="activity"
          :title="activityStore.titleForSelection(activity.tagIds)"
          class="activity-item"
          :style="{
            top: activity.start_time_minutes + 'px',
            height: activity.duration_minutes + 'px',
          }"
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
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useDragAndDrop } from "../composable/useDragAndDrop";
import { useTimeFormatter } from "../composable/useTimeFormatter";
import { buildTodayReceipt } from "../function/buildTodayReceipt";
import { getLocalDayAtMs } from "../function/localCalendar";
import { useActivityStore } from "../store/activity";
import ActivityItem from "../component/ActivityItem.vue";
import CapturePanel from "../component/CapturePanel.vue";
import TodayReceipt from "../component/TodayReceipt.vue";

export default {
  name: "DayView",
  components: { ActivityItem, CapturePanel, TodayReceipt },
  setup() {
    const activityStore = useActivityStore();
    const nowMs = ref(Date.now());
    const currentDate = computed(() => getLocalDayAtMs(nowMs.value));
    activityStore.reconcileRunning(nowMs.value);
    useDragAndDrop(currentDate);

    const activities = computed(() =>
      activityStore.getActivitiesForDay(currentDate.value),
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
    const timeAxisAreaRef = ref<HTMLElement | null>(null);
    const hours = Array.from({ length: 25 }, (_, index) => index);
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
    return {
      activityStore,
      activities,
      hours,
      useTimeFormatter,
      timeAxisAreaRef,
      nowMs,
      currentDate,
      todayReceipt,
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
.time-axis-area {
  position: relative;
  margin-right: 10px;
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
.empty-state {
  margin: 16px;
  color: var(--color-muted);
  line-height: 1.4;
  pointer-events: none;
}
.activity-border {
  position: absolute;
  left: 0;
  right: 0;
  height: 10px;
  cursor: ns-resize;
  background-color: var(--color-drag-target);
  touch-action: none;
}
</style>
