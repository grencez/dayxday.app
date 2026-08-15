import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import CapturePanel from "@/component/CapturePanel.vue";
import { useActivityStore } from "@/store/activity";

const RouterLinkStub = { template: "<a><slot /></a>" };

describe("CapturePanel", () => {
  const nowMs = new Date(2024, 4, 10, 10, 30).getTime();

  beforeEach(() => setActivePinia(createPinia()));

  function configure() {
    const store = useActivityStore();
    store.tagGroups = [
      {
        id: "place",
        name: "Place",
        exclusive: true,
        tags: [
          { id: "office", name: "Office" },
          { id: "home", name: "Home" },
        ],
      },
      {
        id: "work",
        name: "Work",
        tags: [
          { id: "focus", name: "Focus" },
          { id: "old", name: "Old", archived: true },
        ],
      },
    ];
    return store;
  }

  it("shows a configure CTA with an empty configuration", () => {
    const wrapper = mount(CapturePanel, {
      props: { nowMs },
      global: { stubs: { RouterLink: RouterLinkStub } },
    });
    expect(wrapper.text()).toContain("Configure tags");
    expect(wrapper.findAll(".tag-toggle")).toHaveLength(0);
  });

  it("uses grouped accessible toggles and replaces exclusive choices", async () => {
    const store = configure();
    const wrapper = mount(CapturePanel, { props: { nowMs } });
    const toggles = wrapper.findAll(".tag-toggle");
    expect(toggles.map((button) => button.text())).toEqual([
      "Office",
      "Home",
      "Focus",
    ]);
    await toggles[0].trigger("click");
    await toggles[1].trigger("click");
    await toggles[2].trigger("click");
    expect(toggles[0].attributes("aria-pressed")).toBe("false");
    expect(toggles[1].attributes("aria-pressed")).toBe("true");
    await wrapper.get(".start-button").trigger("click");
    expect(store.runningActivity).toEqual({
      tagIds: ["home", "focus"],
      startedAtMs: nowMs,
    });
  });

  it("shows elapsed time and supports recent, stop, and undo", async () => {
    const store = configure();
    store.initializeActivities([
      {
        id: 1,
        tagIds: ["office", "focus"],
        start_time_minutes: 500,
        duration_minutes: 20,
        date: "2024-05-09",
      },
    ]);
    store.runningActivity = { tagIds: ["home"], startedAtMs: nowMs - 90_000 };
    const wrapper = mount(CapturePanel, { props: { nowMs } });
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("Home");
    expect(wrapper.get(".capture-elapsed").text()).toBe("00:01:30");
    await wrapper.get(".recent-activity-button").trigger("click");
    expect(store.runningActivity?.tagIds).toEqual(["office", "focus"]);
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Stop")!
      .trigger("click");
    expect(store.runningActivity).toBeNull();
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Undo")!
      .trigger("click");
    expect(store.runningActivity?.tagIds).toEqual(["office", "focus"]);
  });
});
