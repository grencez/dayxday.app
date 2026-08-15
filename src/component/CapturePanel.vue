<template>
  <section class="capture-panel" aria-label="Activity capture">
    <div class="capture-current">
      <div class="capture-status" aria-live="polite">
        <strong v-if="activityStore.runningActivity">
          {{ activityStore.runningActivity.name }}
        </strong>
        <strong v-else>Not tracking</strong>
      </div>
      <span
        v-if="activityStore.runningActivity"
        class="capture-elapsed"
        aria-label="Elapsed time"
      >
        {{ elapsed }}
      </span>
    </div>

    <fieldset
      v-if="activityStore.recentActivityNames.length"
      class="capture-recent"
    >
      <legend>Recent activities</legend>
      <button
        v-for="name in activityStore.recentActivityNames"
        :key="name"
        type="button"
        class="recent-activity-button"
        @click="activityStore.transitionTo(name, nowMs)"
      >
        {{ name }}
      </button>
    </fieldset>

    <form class="capture-other" @submit.prevent="submitOther">
      <label for="capture-other-name">Other</label>
      <input
        id="capture-other-name"
        v-model="otherName"
        type="text"
        autocomplete="off"
      />
      <button type="submit">Start</button>
    </form>

    <div class="capture-actions">
      <button
        type="button"
        :disabled="activityStore.runningActivity === null"
        @click="activityStore.stop(nowMs)"
      >
        Stop
      </button>
      <button
        v-if="activityStore.canUndoLastTransition"
        type="button"
        @click="activityStore.undoLastTransition(nowMs)"
      >
        Undo
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useActivityStore } from "../store/activity";

const props = defineProps<{
  nowMs: number;
}>();

const activityStore = useActivityStore();
const otherName = ref("");

const elapsed = computed(() => {
  const running = activityStore.runningActivity;
  const elapsedSeconds =
    running === null
      ? 0
      : Math.max(0, Math.floor((props.nowMs - running.startedAtMs) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
});

function submitOther() {
  const name = otherName.value.trim();
  if (!name) return;

  activityStore.transitionTo(name, props.nowMs);
  otherName.value = "";
}
</script>

<style scoped>
.capture-panel {
  grid-column: 1 / 3;
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-muted);
}

.capture-current,
.capture-recent,
.capture-other,
.capture-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.capture-current {
  justify-content: space-between;
}

.capture-status {
  min-width: 0;
  overflow-wrap: anywhere;
}

.capture-elapsed {
  font-variant-numeric: tabular-nums;
}

.capture-recent {
  padding: 0;
  margin: 0;
  border: 0;
}

.capture-recent legend {
  width: 100%;
  margin-bottom: 6px;
  font-size: 0.85em;
  color: var(--color-muted);
}

.capture-other input {
  box-sizing: border-box;
  flex: 1 1 120px;
  min-width: 0;
  min-height: 44px;
  padding: 6px;
}

.capture-panel button {
  max-width: 100%;
  min-height: 44px;
  padding: 6px 10px;
  overflow-wrap: anywhere;
  white-space: normal;
}
</style>
