import "jsdom-global";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import App from "../../src/App.vue";
import router from "../../src/router.mts";
import { useActivityStore } from "../../src/store/activity";

function mountPersistedApp(): VueWrapper {
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);
  return mount(App, { global: { plugins: [pinia, router] } });
}

describe("structured state persistence", () => {
  let wrappers: VueWrapper[] = [];
  beforeEach(() => {
    localStorage.clear();
    wrappers = [];
  });
  afterEach(() => wrappers.forEach((wrapper) => wrapper.unmount()));

  it("uses a fresh key and reloads config, activities, running, and cloned undo", async () => {
    localStorage.setItem(
      "activity",
      JSON.stringify({ activities: [{ name: "legacy" }] }),
    );
    wrappers.push(mountPersistedApp());
    const first = useActivityStore();
    expect(first.activities).toEqual([]);
    first.createGroup("Focus");
    first.addTag(first.tagGroups[0].id, "Meeting");
    const [focus, meeting] = first.tagGroups[0].tags;
    const now = Date.now();
    first.transitionTo([focus.id], now - 60_000);
    first.transitionTo([meeting.id], now);
    await nextTick();
    expect(localStorage.getItem("dayxday-structured-tags-v1")).not.toBeNull();

    wrappers.pop()!.unmount();
    await nextTick();
    wrappers.push(mountPersistedApp());
    const reloaded = useActivityStore();
    expect(reloaded.tagGroups[0].tags.map((tag) => tag.name)).toEqual([
      "Focus",
      "Meeting",
    ]);
    expect(reloaded.activities[0].tagIds).toEqual([focus.id]);
    expect(reloaded.runningActivity?.tagIds).toEqual([meeting.id]);
    expect(reloaded.canUndoLastTransition).toBe(true);
  });

  it("persists confirmed closed-activity deletion", async () => {
    wrappers.push(mountPersistedApp());
    const first = useActivityStore();
    first.createGroup("Focus");
    const tagId = first.tagGroups[0].tags[0].id;
    first.initializeActivities([
      {
        id: 1,
        tagIds: [tagId],
        start_time_minutes: 60,
        duration_minutes: 30,
        date: "2024-05-10",
      },
    ]);
    first.removeActivity(1);
    await nextTick();

    wrappers.pop()!.unmount();
    await nextTick();
    wrappers.push(mountPersistedApp());
    expect(useActivityStore().activities).toEqual([]);
  });

  it("ignores legacy persisted group names without migrating the key", () => {
    localStorage.setItem(
      "dayxday-structured-tags-v1",
      JSON.stringify({
        tagGroups: [
          {
            id: "legacy-group",
            name: "Legacy group name",
            tags: [{ id: "focus", name: "Focus" }],
          },
        ],
      }),
    );
    wrappers.push(mountPersistedApp());
    const store = useActivityStore();
    expect(store.titleForSelection(["focus"])).toBe("Focus");
    expect(document.body.textContent).not.toContain("Legacy group name");
    expect(localStorage.getItem("dayxday-structured-tags-v1")).not.toBeNull();
  });
});
