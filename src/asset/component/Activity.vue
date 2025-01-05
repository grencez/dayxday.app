<template>
  <div class="activity">
    {{ activity.name }}
  </div>
</template>

<script>
export default {
  name: "Activity",
  props: {
    activity: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style scoped>
.activity {
  background-color: #e0e0e0;
  border: 1px solid #ccc;
  padding: 8px;
  margin-bottom: 5px;
}
</style>
