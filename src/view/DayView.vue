<template>
  <div class="day-view">
    <h1>Day View</h1>
    <div class="time-markers">
      <div
        v-for="hour in hours"
        :key="hour"
        class="time-marker"
        :style="{ top: hour * 60 + 'px' }"
      >
        <span class="time-text">{{ useTimeFormatter(hour).formattedTime }}</span>
        <span class="tick-mark"></span>
      </div>
    </div>
    <div class="activity-list">
      <div
        v-for="(activity, index) in activityStore.getActivitiesForDay"
        :key="activity.id"
        class="activity-item"
        :style="{
          top: activity.start_time_minutes + 'px',
          height: activity.duration_minutes + 'px',
        }"
        :contenteditable="false"
        @dblclick="makeEditable"
        @blur="makeUneditable"
      >
        {{ activity.name }}
        <div
          v-if="index > 0"
          class="activity-border"
          :style="{ top: '-5px' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useDragAndDrop } from "../composable/useDragAndDrop";
import { useActivityStore, Activity } from "../store/activity";
import { onMounted } from "vue";
import ActivityItem from "../component/ActivityItem.vue";
import { useTimeFormatter } from "../composable/useTimeFormatter";

export default {
  name: "DayView",
  components: {
    ActivityItem,
  },
  setup() {
    const activityStore = useActivityStore();
    useDragAndDrop();

    onMounted(() => {
      const initialActivities: Activity[] = [
        { id: 1, name: "Morning Routine", start_time_minutes: 0, duration_minutes: 100 },
        { id: 2, name: "Work Session", start_time_minutes: 100, duration_minutes: 200 },
        { id: 3, name: "Lunch Break", start_time_minutes: 300, duration_minutes: 80 },
        { id: 4, name: "Afternoon Tasks", start_time_minutes: 380, duration_minutes: 150 },
        { id: 5, name: "Evening Tasks", start_time_minutes: 530, duration_minutes: 100 },
        { id: 6, name: "Dinner", start_time_minutes: 630, duration_minutes: 60 },
        { id: 7, name: "Relax", start_time_minutes: 690, duration_minutes: 120 },
        { id: 8, name: "Bedtime Routine", start_time_minutes: 810, duration_minutes: 60 },
        { id: 9, name: "Sleep", start_time_minutes: 870, duration_minutes: 570 },
        { id: 10, name: "Wake Up", start_time_minutes: 1440, duration_minutes: 0 },
      ];
      activityStore.initializeActivities(initialActivities);
    });

    // Include 24 to show the final 00:00
    const hours = Array.from({ length: 25 }, (_, i) => i);

    const makeEditable = (event) => {
      event.target.contentEditable = true;
      event.target.focus();
    };

    const makeUneditable = (event) => {
      event.target.contentEditable = false;
    };

    return {
      activityStore,
      hours,
      useTimeFormatter,
      makeEditable,
      makeUneditable,
    };
  },
};
</script>

<style scoped>
.day-view {
  padding: 20px;
  display: grid;
  grid-template-columns: 60px 1fr; /* Define columns for time markers and activity list */
  max-width: 1200px;
  width: 100%;
}

.day-view h1 {
  margin-bottom: 10px;
  grid-column: 1 / 3; /* Span the title across both columns */
}

.time-markers {
  position: relative; /* Make this relative */
  margin-right: 10px;
}

.time-marker {
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
  min-width: 300px; /* Reduced min-width to prevent excessive blank space */
}

.activity-item {
  position: absolute; /* Position absolutely within activity-list */
  left: 10px;
  right: 10px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  padding: 10px;
  cursor: move;
  overflow: hidden;
  user-select: none;
  touch-action: none; /* Disable touch actions to prevent context menu */
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
