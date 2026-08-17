<template>
  <div class="activity-editor-backdrop" @click.self="closeEditor">
    <section
      ref="dialogRef"
      class="activity-editor-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-editor-title"
      aria-describedby="activity-editor-help"
      tabindex="-1"
    >
      <div class="activity-editor-header">
        <h2 id="activity-editor-title">
          {{ activity ? "Edit activity tags" : "Fill unfilled time" }}
        </h2>
        <button
          ref="closeButtonRef"
          type="button"
          class="activity-editor-close"
          :aria-label="
            activity
              ? 'Close activity tag editor'
              : 'Close unfilled time editor'
          "
          @click="closeEditor"
        >
          ×
        </button>
      </div>
      <p id="activity-editor-help" class="activity-editor-help">
        <template v-if="gap">
          Set tags for {{ formatMinute(gap.start) }}–{{
            formatMinute(gap.end)
          }}.
        </template>
        <template v-else
          >Choose one or more tags. Groups are optional.</template
        >
      </p>

      <TagPicker
        :selected-tag-ids="selectedTagIds"
        :tag-groups="activityStore.tagGroups"
        :recent-tag-selections="activityStore.recentTagSelections"
        :title-for-selection="activityStore.titleForSelection"
        recent-class="editor-recent"
        :show-archived="activity !== undefined"
        @update:selected-tag-ids="updateSelectedTags"
        @select-recent="useRecent"
      />

      <p v-if="!selectionIsValid" class="activity-editor-error" role="status">
        Select at least one valid tag to save.
      </p>
      <div
        v-if="activity || (gap && previousActivity)"
        class="activity-editor-delete"
      >
        <button
          v-if="!confirmingDelete"
          ref="deleteButtonRef"
          type="button"
          class="activity-editor-delete-button"
          @click="requestDelete"
        >
          {{ activity ? "Delete activity" : "Delete unfilled time" }}
        </button>
        <div
          v-else
          class="activity-editor-delete-confirmation"
          role="group"
          :aria-label="
            activity
              ? 'Confirm activity deletion'
              : 'Confirm unfilled time deletion'
          "
        >
          <p v-if="activity">Delete this activity? This cannot be undone.</p>
          <p v-else-if="previousActivity">
            Delete this unfilled time? The preceding
            {{ activityStore.titleForSelection(previousActivity.tagIds) }}
            activity will fill it.
          </p>
          <div>
            <button type="button" @click="cancelDelete">Cancel deletion</button>
            <button
              ref="confirmDeleteRef"
              type="button"
              class="activity-editor-confirm-delete"
              @click="deleteTimelineItem"
            >
              {{
                activity
                  ? "Confirm delete activity"
                  : "Confirm delete unfilled time"
              }}
            </button>
          </div>
        </div>
      </div>
      <div class="activity-editor-actions">
        <button type="button" @click="closeEditor">Cancel</button>
        <button
          type="button"
          class="activity-editor-save"
          :disabled="!selectionIsValid"
          @click="save"
        >
          Save
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { isValidSelection } from "../function/tagSelection";
import { type Activity, useActivityStore } from "../store/activity";
import TagPicker from "./TagPicker.vue";

interface TimelineGap {
  start: number;
  end: number;
  date: string;
}

const props = defineProps<{
  activity?: Activity;
  gap?: TimelineGap;
  initialTagIds?: string[];
}>();
const emit = defineEmits<{ close: [] }>();
const activityStore = useActivityStore();
const selectedTagIds = ref([
  ...(props.activity?.tagIds ?? props.initialTagIds ?? []),
]);
const dialogRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const deleteButtonRef = ref<HTMLButtonElement | null>(null);
const confirmDeleteRef = ref<HTMLButtonElement | null>(null);
const confirmingDelete = ref(false);

const selectionIsValid = computed(() =>
  isValidSelection(
    selectedTagIds.value,
    activityStore.tagGroups,
    props.activity === undefined,
  ),
);
const dayActivities = computed(() =>
  props.gap ? activityStore.getActivitiesForDay(props.gap.date) : [],
);
const previousActivity = computed(() =>
  props.gap
    ? dayActivities.value.find(
        (candidate) =>
          candidate.start_time_minutes + candidate.duration_minutes ===
          props.gap!.start,
      )
    : undefined,
);

function closeEditor() {
  emit("close");
}

function save() {
  if (!selectionIsValid.value) return;
  if (props.activity) {
    activityStore.updateActivity(props.activity.id, {
      tagIds: selectedTagIds.value,
    });
  } else if (
    !props.gap ||
    !activityStore.replaceActivityInterval(
      props.gap.start,
      props.gap.end,
      props.gap.date,
      selectedTagIds.value,
    )
  ) {
    return;
  }
  closeEditor();
}

async function requestDelete() {
  confirmingDelete.value = true;
  await nextTick();
  confirmDeleteRef.value?.focus();
}

async function cancelDelete() {
  confirmingDelete.value = false;
  await nextTick();
  deleteButtonRef.value?.focus();
}

function deleteTimelineItem() {
  if (props.activity) {
    activityStore.removeActivity(props.activity.id);
  } else if (props.gap && previousActivity.value) {
    activityStore.updateActivity(previousActivity.value.id, {
      duration_minutes:
        previousActivity.value.duration_minutes +
        props.gap.end -
        props.gap.start,
    });
  } else {
    return;
  }
  closeEditor();
}

function formatMinute(minute: number) {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

async function updateSelectedTags(tagIds: string[]) {
  selectedTagIds.value = tagIds;
  await nextTick();
  if (dialogRef.value && !dialogRef.value.contains(document.activeElement)) {
    closeButtonRef.value?.focus();
  }
}

function useRecent(tagIds: string[]) {
  selectedTagIds.value = tagIds;
  save();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeEditor();
    return;
  }
  if (event.key !== "Tab" || !dialogRef.value) return;
  const focusable = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>("button:not(:disabled)"),
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!dialogRef.value.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(async () => {
  window.addEventListener("keydown", handleKeydown);
  await nextTick();
  closeButtonRef.value?.focus();
});

onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>

<style scoped>
.activity-editor-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: var(--color-modal-backdrop);
}
.activity-editor-sheet {
  box-sizing: border-box;
  width: min(100%, 620px);
  max-height: min(82vh, 720px);
  padding: 18px;
  overflow-y: auto;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px 16px 8px 8px;
  box-shadow: var(--shadow-modal);
}
.activity-editor-header,
.activity-editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.activity-editor-header {
  justify-content: space-between;
}
.activity-editor-header h2 {
  margin: 0;
}
.activity-editor-help {
  margin: 6px 0 14px;
  color: var(--color-muted);
}
.activity-editor-close,
.activity-editor-actions button {
  min-width: 44px;
  min-height: 44px;
}
.activity-editor-close {
  font-size: 1.5rem;
}
.activity-editor-actions {
  justify-content: flex-end;
  margin-top: 14px;
}
.activity-editor-error {
  margin: 10px 0 0;
  color: var(--color-warning);
}
.activity-editor-save {
  font-weight: 700;
}
.activity-editor-delete {
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid var(--color-border);
}
.activity-editor-delete-button,
.activity-editor-delete-confirmation button {
  min-height: 44px;
}
.activity-editor-delete-button,
.activity-editor-confirm-delete {
  color: var(--color-warning);
  font-weight: 700;
}
.activity-editor-delete-confirmation {
  display: grid;
  gap: 8px;
}
.activity-editor-delete-confirmation p {
  margin: 0;
}
.activity-editor-delete-confirmation div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (min-width: 700px) {
  .activity-editor-backdrop {
    align-items: center;
  }
  .activity-editor-sheet {
    border-radius: 12px;
  }
}
</style>
