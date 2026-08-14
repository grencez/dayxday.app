import "jsdom-global";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import App from "../../src/App.vue";
import { useActivityStore } from "../../src/store/activity";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import router from "../../src/router.mts";

function mountPersistedApp(): VueWrapper {
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);
  return mount(App, {
    global: {
      plugins: [pinia, router],
    },
  });
}

describe("activity persistence", () => {
  let wrappers: VueWrapper[] = [];

  beforeEach(() => {
    window.localStorage.clear();
    wrappers = [];
  });

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
  });

  it("reloads closed activities, running capture, and guarded undo", async () => {
    wrappers.push(mountPersistedApp());
    const firstStore = useActivityStore();
    const nowMs = Date.now();

    firstStore.transitionTo("Focus", nowMs - 60_000);
    firstStore.transitionTo("Meeting", nowMs);
    expect(firstStore.activities).toHaveLength(1);
    expect(firstStore.canUndoLastTransition).toBe(true);

    wrappers.pop()!.unmount();
    await nextTick();

    wrappers.push(mountPersistedApp());
    const reloadedStore = useActivityStore();

    expect(reloadedStore.activities).toHaveLength(1);
    expect(reloadedStore.activities[0].name).toBe("Focus");
    expect(reloadedStore.runningActivity).toEqual({
      name: "Meeting",
      startedAtMs: nowMs,
    });
    expect(reloadedStore.canUndoLastTransition).toBe(true);
  });
});
