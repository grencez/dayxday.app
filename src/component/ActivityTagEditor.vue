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
        <h2 id="activity-editor-title">Edit activity tags</h2>
        <button
          ref="closeButtonRef"
          type="button"
          class="activity-editor-close"
          aria-label="Close activity tag editor"
          @click="closeEditor"
        >
          ×
        </button>
      </div>
      <p id="activity-editor-help" class="activity-editor-help">
        Choose one or more tags. Groups are optional.
      </p>

      <TagPicker
        :selected-tag-ids="selectedTagIds"
        :tag-groups="activityStore.tagGroups"
        :recent-tag-selections="activityStore.recentTagSelections"
        :title-for-selection="activityStore.titleForSelection"
        recent-class="editor-recent"
        show-archived
        @update:selected-tag-ids="updateSelectedTags"
        @select-recent="useRecent"
      />

      <p v-if="!selectionIsValid" class="activity-editor-error" role="status">
        Select at least one valid tag to save.
      </p>
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

const props = defineProps<{ activity: Activity }>();
const emit = defineEmits<{ close: [] }>();
const activityStore = useActivityStore();
const selectedTagIds = ref([...props.activity.tagIds]);
const dialogRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);

const selectionIsValid = computed(() =>
  isValidSelection(selectedTagIds.value, activityStore.tagGroups, false),
);

function closeEditor() {
  emit("close");
}

function save() {
  if (!selectionIsValid.value) return;
  activityStore.updateActivity(props.activity.id, {
    tagIds: selectedTagIds.value,
  });
  closeEditor();
}

async function updateSelectedTags(tagIds: string[]) {
  selectedTagIds.value = tagIds;
  await nextTick();
  if (dialogRef.value && !dialogRef.value.contains(document.activeElement)) {
    closeButtonRef.value?.focus();
  }
}

function useRecent(tagIds: string[]) {
  activityStore.updateActivity(props.activity.id, { tagIds });
  closeEditor();
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

@media (min-width: 700px) {
  .activity-editor-backdrop {
    align-items: center;
  }
  .activity-editor-sheet {
    border-radius: 12px;
  }
}
</style>
