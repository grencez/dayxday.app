<template>
  <div class="tag-picker">
    <div v-if="activeGroups.length" class="tag-choices">
      <fieldset v-for="group in activeGroups" :key="group.id">
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

    <fieldset v-if="archivedSelectedTags.length" class="archived-tag-choices">
      <legend>Archived tags (kept unless removed)</legend>
      <button
        v-for="tag in archivedSelectedTags"
        :key="tag.id"
        type="button"
        class="tag-toggle archived-tag-toggle selected"
        aria-pressed="true"
        :aria-label="`Remove archived tag ${tag.name}`"
        @click="removeArchivedTag(tag.id)"
      >
        {{ tag.name }} (archived)
      </button>
    </fieldset>

    <fieldset
      v-if="recentTagSelections.length"
      :class="['tag-picker-recent', recentClass]"
    >
      <legend>Recent combinations</legend>
      <button
        v-for="tagIds in recentTagSelections"
        :key="selectionKey(tagIds)"
        type="button"
        class="recent-activity-button"
        @click="$emit('select-recent', tagIds)"
      >
        {{ titleForSelection(tagIds) }}
      </button>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  selectionKey,
  type Tag,
  type TagGroup,
} from "../function/tagSelection";

const props = withDefaults(
  defineProps<{
    tagGroups: TagGroup[];
    selectedTagIds: string[];
    recentTagSelections?: string[][];
    titleForSelection: (tagIds: readonly string[]) => string;
    recentClass?: string;
    showArchived?: boolean;
  }>(),
  {
    recentTagSelections: () => [],
    recentClass: "",
    showArchived: false,
  },
);

const emit = defineEmits<{
  "update:selectedTagIds": [tagIds: string[]];
  "select-recent": [tagIds: string[]];
}>();

const activeGroups = computed(() =>
  props.tagGroups
    .map((group) => ({
      ...group,
      tags: group.tags.filter((tag) => tag.archived !== true),
    }))
    .filter((group) => group.tags.length > 0),
);

const archivedSelectedTags = computed<Tag[]>(() => {
  if (!props.showArchived) return [];
  const selected = new Set(props.selectedTagIds);
  return props.tagGroups.flatMap((group) =>
    group.tags.filter((tag) => tag.archived === true && selected.has(tag.id)),
  );
});

function toggleTag(groupId: string, tagId: string) {
  const group = props.tagGroups.find((candidate) => candidate.id === groupId);
  const tag = group?.tags.find((candidate) => candidate.id === tagId);
  if (!group || !tag || tag.archived === true) return;

  const selected = new Set(props.selectedTagIds);
  if (selected.has(tagId)) {
    selected.delete(tagId);
  } else {
    if (group.exclusive) {
      for (const groupTag of group.tags) {
        if (groupTag.archived !== true) selected.delete(groupTag.id);
      }
    }
    selected.add(tagId);
  }
  emit("update:selectedTagIds", [...selected]);
}

function removeArchivedTag(tagId: string) {
  emit(
    "update:selectedTagIds",
    props.selectedTagIds.filter((candidate) => candidate !== tagId),
  );
}
</script>

<style scoped>
.tag-picker,
.tag-choices {
  display: grid;
  gap: 8px;
}
.tag-choices fieldset,
.tag-picker-recent,
.archived-tag-choices {
  padding: 0;
  margin: 0;
  border: 0;
}
.tag-choices legend,
.tag-picker-recent legend,
.archived-tag-choices legend {
  width: 100%;
  margin-bottom: 6px;
  font-size: 0.85em;
  color: var(--color-muted);
}
.tag-toggle,
.recent-activity-button {
  box-sizing: border-box;
  max-width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  margin: 0 6px 6px 0;
  overflow-wrap: anywhere;
  white-space: normal;
}
.tag-toggle.selected {
  outline: 2px solid var(--color-current);
}
.archived-tag-toggle {
  border-style: dashed;
}
.tag-picker-recent {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
</style>
