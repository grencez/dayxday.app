<template>
  <section class="capture-panel" aria-label="Activity capture">
    <div class="capture-current">
      <div class="capture-status" aria-live="polite">
        <strong v-if="activityStore.runningActivity">
          {{
            activityStore.titleForSelection(
              activityStore.runningActivity.tagIds,
            )
          }}
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

    <template v-if="activityStore.activeTagGroups.length">
      <div class="tag-choices">
        <fieldset
          v-for="group in activityStore.activeTagGroups"
          :key="group.id"
        >
          <legend>
            {{ group.name }}<span v-if="group.exclusive"> (choose one)</span>
          </legend>
          <button
            v-for="tag in group.tags"
            :key="tag.id"
            type="button"
            class="tag-toggle"
            :class="{ selected: selectedTagIds.includes(tag.id) }"
            :aria-pressed="selectedTagIds.includes(tag.id)"
            @click="toggleTag(group.id, tag.id)"
          >
            {{ tag.name }}
          </button>
        </fieldset>
      </div>

      <fieldset
        v-if="activityStore.recentTagSelections.length"
        class="capture-recent"
      >
        <legend>Recent combinations</legend>
        <button
          v-for="tagIds in activityStore.recentTagSelections"
          :key="selectionKey(tagIds)"
          type="button"
          class="recent-activity-button"
          @click="useRecent(tagIds)"
        >
          {{ activityStore.titleForSelection(tagIds) }}
        </button>
      </fieldset>
    </template>

    <div v-else class="capture-empty">
      <p>Create tags before tracking an activity.</p>
      <RouterLink class="configure-link" to="/tags">Configure tags</RouterLink>
    </div>

    <div class="capture-actions">
      <button
        v-if="activityStore.activeTagGroups.length"
        type="button"
        class="start-button"
        :disabled="!selectionIsValid"
        @click="activityStore.transitionTo(selectedTagIds, nowMs)"
      >
        {{ activityStore.runningActivity ? "Switch" : "Start" }}
      </button>
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
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  isValidSelection,
  normalizeSelection,
  selectionKey,
} from "../function/tagSelection";
import { useActivityStore } from "../store/activity";

const props = defineProps<{ nowMs: number }>();
const activityStore = useActivityStore();
const selectedTagIds = ref<string[]>(
  normalizeSelection(
    activityStore.runningActivity?.tagIds ?? [],
    activityStore.tagGroups,
  ),
);
const selectionIsValid = computed(() =>
  isValidSelection(selectedTagIds.value, activityStore.tagGroups, true),
);

watch(
  () => activityStore.runningActivity?.tagIds,
  (tagIds) => {
    if (tagIds) {
      selectedTagIds.value = normalizeSelection(
        tagIds,
        activityStore.tagGroups,
      );
    }
  },
);

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

function toggleTag(groupId: string, tagId: string) {
  const group = activityStore.tagGroups.find(
    (candidate) => candidate.id === groupId,
  );
  if (!group) return;
  const selected = new Set(selectedTagIds.value);
  if (selected.has(tagId)) {
    selected.delete(tagId);
  } else {
    if (group.exclusive) {
      for (const tag of group.tags) selected.delete(tag.id);
    }
    selected.add(tagId);
  }
  selectedTagIds.value = [...selected];
}

function useRecent(tagIds: string[]) {
  selectedTagIds.value = [...tagIds];
  activityStore.transitionTo(tagIds, props.nowMs);
}
</script>

<style scoped>
.capture-panel {
  grid-column: 1 / 3;
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-muted);
}

.capture-current,
.capture-actions,
.capture-recent,
.capture-empty {
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

.tag-choices {
  display: grid;
  gap: 8px;
}
.tag-choices fieldset,
.capture-recent {
  padding: 0;
  margin: 0;
  border: 0;
}
.tag-choices legend,
.capture-recent legend {
  width: 100%;
  margin-bottom: 6px;
  font-size: 0.85em;
  color: var(--color-muted);
}
.tag-toggle {
  margin: 0 6px 6px 0;
}
.tag-toggle.selected {
  outline: 2px solid var(--color-current);
}

.capture-panel button,
.configure-link {
  box-sizing: border-box;
  max-width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  overflow-wrap: anywhere;
  white-space: normal;
}
.configure-link {
  display: inline-flex;
  align-items: center;
}
.capture-empty p {
  flex: 1 1 180px;
  margin: 0;
}
</style>
