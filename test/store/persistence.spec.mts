import "jsdom-global";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, it, expect } from "vitest";
import { nextTick } from "vue";
import App from "../../src/App.vue";
import { useActivityStore } from "../../src/store/activity";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import router from "../../src/router.mts";

describe("Persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should persist the store state across page reloads", async () => {
    // First visit
    const pinia1 = createPinia();
    pinia1.use(piniaPluginPersistedstate);
    const wrapper1 = mount(App, {
      global: {
        plugins: [pinia1, router],
      },
    });

    const activityStore1 = useActivityStore();

    // Simulate user interaction or data loading
    // Since App doesn't auto-load data on mount unless Reset is clicked, or we can manually set it.
    // Let's use initializeActivities to set some data.
    activityStore1.initializeActivities([
      {
        id: 1,
        name: "A",
        start_time_minutes: 0,
        duration_minutes: 60,
        date: "2023-10-27",
      },
    ]);

    expect(activityStore1.activities.length).toBe(1);

    // Unmount to simulate closing
    wrapper1.unmount();
    // Persistence writes flush through Vue's scheduler; let them land
    // before the simulated reload.
    await nextTick();

    // Second visit (simulating reload)
    const pinia2 = createPinia();
    pinia2.use(piniaPluginPersistedstate);
    mount(App, {
      global: {
        plugins: [pinia2, router],
      },
    });

    const activityStore2 = useActivityStore();
    // With synchronous localStorage, state should be available immediately after initialization
    expect(activityStore2.activities.length).toBe(1);
    expect(activityStore2.activities[0].name).toBe("A");
  });
});
