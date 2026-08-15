<template>
  <div>
    <p class="construction-note">🚧 Under construction</p>
    <router-view />
  </div>
</template>

<style scoped>
.construction-note {
  margin: 0;
  padding: 6px 12px;
  text-align: center;
  font-size: 0.85em;
  color: var(--color-warning);
  background-color: var(--color-warning-background);
  border-bottom: 1px solid var(--color-warning-border);
}
</style>
