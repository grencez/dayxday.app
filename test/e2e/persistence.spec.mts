import "jsdom-global";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, it, expect } from "vitest";
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
    expect(activityStore1.activities.length).toBe(0);

    const populateButton1 = wrapper1.find("button");
    await populateButton1.trigger("click");

    expect(activityStore1.activities.length).toBe(5);

    wrapper1.unmount();

    // Second visit (simulating reload)
    const pinia2 = createPinia();
    pinia2.use(piniaPluginPersistedstate);
    const wrapper2 = mount(App, {
      global: {
        plugins: [pinia2, router],
      },
    });

    const activityStore2 = useActivityStore();
    expect(activityStore2.activities.length).toBe(5);
  });
});
