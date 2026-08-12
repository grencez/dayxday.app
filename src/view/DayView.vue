<template>
  <div class="day-view">
    <h1>Day View</h1>
    <div class="button-bar">
      <button class="reset-button" @click="resetActivities">Reset</button>
      <button class="clear-button" @click="clearActivities">Clear</button>
    </div>
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
      <template v-for="(activity, index) in activities" :key="activity.id">
        <ActivityItem
          :activity="activity"
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
import { useDragAndDrop } from "../composable/useDragAndDrop";
import { useActivityStore, Activity } from "../store/activity";
import { ref, computed } from "vue";
import ActivityItem from "../component/ActivityItem.vue";
import { useTimeFormatter } from "../composable/useTimeFormatter";

export default {
  name: "DayView",
  components: {
    ActivityItem,
  },
  setup() {
    const activityStore = useActivityStore();
    // Use today's date for now, matching the test default
    // In a real app, this would be reactive based on selected date
    const currentDate = ref(new Date().toISOString().split("T")[0]);

    useDragAndDrop(currentDate.value);

    const activities = computed(() =>
      activityStore.getActivitiesForDay(currentDate.value),
    );

    const timeAxisAreaRef = ref<HTMLElement | null>(null);

    const resetActivities = () => {
      const initialActivities: Activity[] = [
        {
          id: 1,
          name: "Morning Routine",
          start_time_minutes: 0,
          duration_minutes: 100,
          date: currentDate.value,
        },
        {
          id: 2,
          name: "Work Session",
          start_time_minutes: 100,
          duration_minutes: 200,
          date: currentDate.value,
        },
        {
          id: 3,
          name: "Lunch Break",
          start_time_minutes: 300,
          duration_minutes: 80,
          date: currentDate.value,
        },
        {
          id: 4,
          name: "Afternoon Tasks",
          start_time_minutes: 380,
          duration_minutes: 150,
          date: currentDate.value,
        },
        {
          id: 5,
          name: "Evening Tasks",
          start_time_minutes: 530,
          duration_minutes: 100,
          date: currentDate.value,
        },
        {
          id: 6,
          name: "Dinner",
          start_time_minutes: 630,
          duration_minutes: 60,
          date: currentDate.value,
        },
        {
          id: 7,
          name: "Relax",
          start_time_minutes: 690,
          duration_minutes: 120,
          date: currentDate.value,
        },
        {
          id: 8,
          name: "Bedtime Routine",
          start_time_minutes: 810,
          duration_minutes: 60,
          date: currentDate.value,
        },
        {
          id: 9,
          name: "Sleep",
          start_time_minutes: 870,
          duration_minutes: 570,
          date: currentDate.value,
        },
        {
          id: 10,
          name: "Wake Up",
          start_time_minutes: 1440,
          duration_minutes: 0,
          date: currentDate.value,
        },
      ];
      activityStore.initializeActivities(initialActivities);
    };

    const clearActivities = () => {
      // Should probably clear all activities or just for the day?
      // Since initializeActivities replaces everything in the store,
      // if we had multiple days, this would be bad.
      // But for now, let's keep it simple as we haven't implemented multi-day filtering in initialization.
      // But wait, the store only supports initializing the WHOLE list.
      // So clearActivities effectively clears EVERYTHING.
      activityStore.initializeActivities([]);
    };

    // Include 24 to show the final 00:00
    const hours = Array.from({ length: 25 }, (_, i) => i);

    const handleTimeAxisAreaClick = (event: MouseEvent) => {
      if (!timeAxisAreaRef.value) {
        return;
      }
      const rect = timeAxisAreaRef.value.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const timeInMinutes = Math.round((y / rect.height) * 1440);
      activityStore.insertActivityAtTime(timeInMinutes, currentDate.value, {
        name: "New Activity",
      });
    };

    return {
      activityStore,
      activities,
      hours,
      useTimeFormatter,
      handleTimeAxisAreaClick,
      timeAxisAreaRef,
      resetActivities,
      clearActivities,
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

.button-bar {
  grid-column: 1 / 3;
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
}

.reset-button {
}

.clear-button {
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
  min-width: 300px; /* Reduced min-width to prevent excessive blank space */
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
