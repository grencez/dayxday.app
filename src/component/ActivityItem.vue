<template>
  <div
    class="activity-item"
    :data-activity-id="activity.id"
    :contenteditable="false"
    @dblclick="makeEditable"
    @blur="commitRename"
    @keydown="handleKeydown"
  >
    {{ activity.name }}
  </div>
</template>

<script>
export default {
  name: "ActivityItem",
  props: {
    activity: {
      type: Object,
      required: true,
    },
  },
  emits: ["rename"],
  methods: {
    makeEditable(event) {
      event.currentTarget.contentEditable = "true";
      event.currentTarget.focus();
    },
    commitRename(event) {
      const element = event.currentTarget;
      element.contentEditable = "false";
      const newName = element.textContent.trim();
      if (newName && newName !== this.activity.name) {
        this.$emit("rename", { id: this.activity.id, name: newName });
      } else {
        element.textContent = this.activity.name;
      }
    },
    handleKeydown(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        this.commitRename(event);
      } else if (event.key === "Escape") {
        event.currentTarget.textContent = this.activity.name;
        event.currentTarget.contentEditable = "false";
      }
    },
  },
};
</script>

<style scoped>
.activity-item {
  position: absolute;
  left: 0;
  right: 0;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  padding: 10px;
  cursor: move;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}
</style>
