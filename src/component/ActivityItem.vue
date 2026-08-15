<template>
  <div class="activity-item" :data-activity-id="activity.id">
    {{ title }}
  </div>
</template>

<script setup lang="ts">
import type { Activity } from "../store/activity";

defineProps<{
  activity: Activity;
  title: string;
}>();
</script>

<style scoped>
.activity-item {
  box-sizing: border-box;
  position: absolute;
  left: 0;
  right: 0;
  background-color: var(--color-activity);
  border: 1px solid var(--color-border);
  padding: 10px;
  cursor: move;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}
</style>
