<template>
  <div>
    <button @click="populateStore">Populate Store</button>
    <router-view />
  </div>
</template>

<script setup>
import { useActivityStore } from "./store/activity";

const activityStore = useActivityStore();

function populateStore() {
  const activities = [
    { id: 1, name: "Breakfast", start_time_minutes: 480, duration_minutes: 60 },
    { id: 2, name: "Work", start_time_minutes: 540, duration_minutes: 240 },
    { id: 3, name: "Lunch", start_time_minutes: 780, duration_minutes: 60 },
    { id: 4, name: "Work", start_time_minutes: 840, duration_minutes: 240 },
    { id: 5, name: "Dinner", start_time_minutes: 1080, duration_minutes: 60 },
  ];
  activityStore.initializeActivities(activities);
}
</script>
