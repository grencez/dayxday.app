<template>
  <main class="tags-view">
    <h1>Tags</h1>
    <p class="intro">Organize the tags used to describe each activity.</p>

    <form class="create-group" @submit.prevent="createGroup">
      <h2>Create group</h2>
      <label>
        Initial tag
        <input v-model="initialTagName" required />
      </label>
      <button type="submit">Create group</button>
    </form>

    <p v-if="message" class="config-message" role="status">{{ message }}</p>
    <p v-if="activityStore.tagGroups.length === 0" class="empty-config">
      No tag groups yet.
    </p>

    <section
      v-for="(group, groupIndex) in activityStore.tagGroups"
      :key="group.id"
      class="tag-group-card"
    >
      <div class="group-heading">
        <h2>{{ groupLabel(groupIndex) }}</h2>
        <div class="reorder-controls">
          <button
            type="button"
            :disabled="groupIndex === 0"
            :aria-label="`Move ${groupLabel(groupIndex)} up`"
            @click="activityStore.moveGroup(group.id, -1)"
          >
            ↑
          </button>
          <button
            type="button"
            :disabled="groupIndex === activityStore.tagGroups.length - 1"
            :aria-label="`Move ${groupLabel(groupIndex)} down`"
            @click="activityStore.moveGroup(group.id, 1)"
          >
            ↓
          </button>
        </div>
      </div>

      <label class="exclusive-control">
        <input
          type="checkbox"
          :checked="group.exclusive === true"
          @change="activityStore.toggleGroupExclusive(group.id)"
        />
        At most one tag from this group
      </label>

      <h3>Active tags</h3>
      <p v-if="activeTags(group).length === 0" class="empty-config">
        All tags in this group are archived.
      </p>
      <ul v-else class="tag-list">
        <li v-for="(tag, activeTagIndex) in activeTags(group)" :key="tag.id">
          <input
            :value="tag.name"
            :aria-label="`Rename tag ${tag.name}`"
            @change="renameTag(tag.id, tag.name, $event)"
          />
          <div class="tag-actions">
            <button
              type="button"
              :disabled="activeTagIndex === 0"
              :aria-label="`Move ${tag.name} up`"
              @click="activityStore.moveTag(group.id, tag.id, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              :disabled="activeTagIndex === activeTags(group).length - 1"
              :aria-label="`Move ${tag.name} down`"
              @click="activityStore.moveTag(group.id, tag.id, 1)"
            >
              ↓
            </button>
            <button type="button" @click="activityStore.archiveTag(tag.id)">
              Archive
            </button>
          </div>
        </li>
      </ul>

      <form class="add-tag" @submit.prevent="addTag(group.id)">
        <label>
          Add tag
          <input v-model="newTagNames[group.id]" required />
        </label>
        <button type="submit">Add</button>
      </form>

      <details v-if="archivedTags(group).length" class="archived-tags">
        <summary>Archived tags ({{ archivedTags(group).length }})</summary>
        <ul class="tag-list">
          <li v-for="tag in archivedTags(group)" :key="tag.id">
            <input
              :value="tag.name"
              :aria-label="`Rename archived tag ${tag.name}`"
              @change="renameTag(tag.id, tag.name, $event)"
            />
            <button type="button" @click="restoreTag(tag.id)">Restore</button>
          </li>
        </ul>
      </details>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import type { Tag, TagGroup } from "../function/tagSelection";
import { useActivityStore } from "../store/activity";

const activityStore = useActivityStore();
const initialTagName = ref("");
const newTagNames = reactive<Record<string, string>>({});
const message = ref("");

const activeTags = (group: TagGroup): Tag[] =>
  group.tags.filter((tag) => tag.archived !== true);
const archivedTags = (group: TagGroup): Tag[] =>
  group.tags.filter((tag) => tag.archived === true);

const groupLabel = (index: number) => `Group ${index + 1}`;

function createGroup() {
  if (activityStore.createGroup(initialTagName.value)) {
    initialTagName.value = "";
    message.value = "Group created.";
  } else {
    message.value = "Enter a globally unique tag name.";
  }
}

function addTag(groupId: string) {
  if (activityStore.addTag(groupId, newTagNames[groupId] ?? "")) {
    newTagNames[groupId] = "";
    message.value = "Tag added.";
  } else {
    message.value = "Tag names must be nonempty and globally unique.";
  }
}

function renameTag(tagId: string, previousName: string, event: Event) {
  const input = event.target as HTMLInputElement;
  if (!activityStore.renameTag(tagId, input.value)) {
    input.value = previousName;
    message.value = "Tag names must be nonempty and globally unique.";
  }
}

function restoreTag(tagId: string) {
  message.value = activityStore.restoreTag(tagId)
    ? "Tag restored."
    : "Rename the archived tag before restoring it.";
}
</script>

<style scoped>
.tags-view {
  box-sizing: border-box;
  width: 100%;
  max-width: 760px;
  padding: 20px;
}
.tags-view h1 {
  margin-bottom: 4px;
}
.intro {
  margin-top: 0;
  color: var(--color-muted);
}
.create-group,
.tag-group-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  margin: 16px 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}
.create-group h2,
.tag-group-card h2,
.tag-group-card h3 {
  margin: 0;
}
.create-group label,
.add-tag label {
  display: grid;
  gap: 4px;
}
.group-heading,
.reorder-controls,
.tag-actions,
.add-tag,
.tag-list li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-heading {
  justify-content: space-between;
}
.tag-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.tag-list li {
  flex-wrap: wrap;
}
.tag-list input {
  flex: 1 1 180px;
  min-width: 0;
}
.tag-actions {
  flex-wrap: wrap;
}
.add-tag {
  flex-wrap: wrap;
}
.add-tag label {
  flex: 1 1 180px;
}
.tags-view input,
.tags-view button {
  box-sizing: border-box;
  min-height: 44px;
  padding: 7px 9px;
}
.config-message,
.empty-config {
  color: var(--color-muted);
}
.archived-tags summary {
  min-height: 44px;
  cursor: pointer;
}
</style>
