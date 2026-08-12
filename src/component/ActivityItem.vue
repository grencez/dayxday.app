<template>
  <div
    class="activity-item"
    :data-activity-id="activity.id"
    :contenteditable="false"
    @dblclick="makeEditable"
    @blur="makeUneditable"
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
  methods: {
    makeEditable(event) {
      event.target.contentEditable = true;
      event.target.focus();
    },
    makeUneditable(event) {
      event.target.contentEditable = false;
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
