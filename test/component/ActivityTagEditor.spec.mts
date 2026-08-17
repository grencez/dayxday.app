import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import ActivityTagEditor from "@/component/ActivityTagEditor.vue";
import { useActivityStore } from "@/store/activity";

const day = "2024-05-10";

describe("ActivityTagEditor", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useActivityStore();
    store.tagGroups = [
      {
        id: "place",
        exclusive: true,
        tags: [
          { id: "office", name: "Office" },
          { id: "home", name: "Home" },
          { id: "retired", name: "Retired place", archived: true },
        ],
      },
      {
        id: "work",
        tags: [
          { id: "focus", name: "Focus" },
          { id: "meeting", name: "Meeting" },
          { id: "old", name: "Legacy", archived: true },
        ],
      },
    ];
    store.initializeActivities([
      {
        id: 1,
        tagIds: ["office", "old"],
        start_time_minutes: 60,
        duration_minutes: 60,
        date: day,
      },
      {
        id: 2,
        tagIds: ["home", "focus"],
        start_time_minutes: 120,
        duration_minutes: 60,
        date: day,
      },
    ]);
  });

  function mountEditor(activityId = 1) {
    const store = useActivityStore();
    const activity = store.activities.find(({ id }) => id === activityId)!;
    return mount(ActivityTagEditor, { props: { activity } });
  }

  it("moves focus into the named dialog", async () => {
    const store = useActivityStore();
    const wrapper = mount(ActivityTagEditor, {
      attachTo: document.body,
      props: { activity: store.activities[0] },
    });
    await wrapper.vm.$nextTick();
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Close activity tag editor",
    );
    wrapper.unmount();
  });

  it("keeps focus in the dialog when a focused archived tag is removed", async () => {
    const store = useActivityStore();
    const wrapper = mount(ActivityTagEditor, {
      attachTo: document.body,
      props: { activity: store.activities[0] },
    });
    await wrapper.vm.$nextTick();
    const archived = wrapper.get<HTMLButtonElement>(".archived-tag-toggle");
    archived.element.focus();
    await archived.trigger("click");
    await wrapper.vm.$nextTick();

    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Close activity tag editor",
    );
    wrapper.unmount();
  });

  it("stages manual changes and saves through the store", async () => {
    const store = useActivityStore();
    const wrapper = mountEditor();
    expect(wrapper.attributes("role")).not.toBe("dialog");
    expect(wrapper.get('[role="dialog"]').attributes("aria-modal")).toBe(
      "true",
    );

    await wrapper
      .findAll(".tag-toggle")
      .find((button) => button.text() === "Focus")!
      .trigger("click");
    expect(store.activities[0].tagIds).toEqual(["office", "old"]);
    await wrapper.get(".activity-editor-save").trigger("click");
    expect(store.activities[0].tagIds).toEqual(["office", "focus", "old"]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("cancels staged changes without saving", async () => {
    const store = useActivityStore();
    const wrapper = mountEditor();
    await wrapper
      .findAll(".tag-toggle")
      .find((button) => button.text() === "Focus")!
      .trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Cancel")!
      .trigger("click");
    expect(store.activities[0].tagIds).toEqual(["office", "old"]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("applies a recent valid combination in one tap and closes", async () => {
    const store = useActivityStore();
    const wrapper = mountEditor();
    const recent = wrapper.get(".recent-activity-button");
    expect(recent.text()).toBe("Home · Focus");
    await recent.trigger("click");
    expect(store.activities[0].tagIds).toEqual(["home", "focus"]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("replaces the prior choice in an exclusive group", async () => {
    const store = useActivityStore();
    const wrapper = mountEditor();
    const toggles = wrapper.findAll(".tag-toggle");
    const office = toggles.find((button) => button.text() === "Office")!;
    const home = toggles.find((button) => button.text() === "Home")!;
    await home.trigger("click");
    expect(office.attributes("aria-pressed")).toBe("false");
    expect(home.attributes("aria-pressed")).toBe("true");
    await wrapper.get(".activity-editor-save").trigger("click");
    expect(store.activities[0].tagIds).toEqual(["home", "old"]);
  });

  it("preserves an archived tag until it is explicitly removed", async () => {
    const store = useActivityStore();
    const wrapper = mountEditor();
    const archived = wrapper.get(".archived-tag-toggle");
    expect(archived.text()).toContain("Legacy (archived)");
    expect(archived.attributes("aria-label")).toBe(
      "Remove archived tag Legacy",
    );
    await wrapper.get(".activity-editor-save").trigger("click");
    expect(store.activities[0].tagIds).toEqual(["office", "old"]);

    const removeWrapper = mountEditor();
    await removeWrapper.get(".archived-tag-toggle").trigger("click");
    expect(removeWrapper.find(".archived-tag-toggle").exists()).toBe(false);
    await removeWrapper.get(".activity-editor-save").trigger("click");
    expect(store.activities[0].tagIds).toEqual(["office"]);
  });

  it("does not silently discard an archived exclusive choice", async () => {
    const store = useActivityStore();
    store.activities[0].tagIds = ["retired", "focus"];
    const wrapper = mountEditor();
    await wrapper
      .findAll(".tag-toggle")
      .find((button) => button.text() === "Office")!
      .trigger("click");

    expect(wrapper.get(".archived-tag-toggle").text()).toContain(
      "Retired place",
    );
    expect(
      wrapper.get<HTMLButtonElement>(".activity-editor-save").element.disabled,
    ).toBe(true);
    await wrapper.get(".archived-tag-toggle").trigger("click");
    await wrapper.get(".activity-editor-save").trigger("click");
    expect(store.activities[0].tagIds).toEqual(["office", "focus"]);
  });

  it("does not allow an empty selection to save", async () => {
    const store = useActivityStore();
    store.activities[0].tagIds = ["office"];
    const wrapper = mountEditor();
    await wrapper
      .findAll(".tag-toggle")
      .find((button) => button.text() === "Office")!
      .trigger("click");
    const save = wrapper.get<HTMLButtonElement>(".activity-editor-save");
    expect(save.element.disabled).toBe(true);
    expect(wrapper.get('[role="status"]').text()).toContain(
      "Select at least one valid tag",
    );
    await save.trigger("click");
    expect(store.activities[0].tagIds).toEqual(["office"]);
    expect(wrapper.emitted("close")).toBeUndefined();
  });

  it("turns an exact unfilled interval into a tagged activity", async () => {
    const store = useActivityStore();
    store.updateActivity(2, {
      start_time_minutes: 180,
      duration_minutes: 60,
    });
    const wrapper = mount(ActivityTagEditor, {
      props: {
        gap: { start: 120, end: 180, date: day },
        initialTagIds: ["home", "focus"],
      },
    });

    expect(wrapper.get("h2").text()).toBe("Fill unfilled time");
    expect(wrapper.get(".activity-editor-help").text()).toContain(
      "02:00–03:00",
    );
    expect(wrapper.find(".archived-tag-toggle").exists()).toBe(false);
    await wrapper.get(".activity-editor-save").trigger("click");

    expect(store.getActivitiesForDay(day)).toMatchObject([
      { id: 1, start_time_minutes: 60, duration_minutes: 60 },
      {
        tagIds: ["home", "focus"],
        start_time_minutes: 120,
        duration_minutes: 60,
      },
      { id: 2, start_time_minutes: 180, duration_minutes: 60 },
    ]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("confirms deleting unfilled time and extends the previous activity", async () => {
    const store = useActivityStore();
    store.updateActivity(2, {
      start_time_minutes: 180,
      duration_minutes: 60,
    });
    const wrapper = mount(ActivityTagEditor, {
      props: {
        gap: { start: 120, end: 180, date: day },
        initialTagIds: [],
      },
    });

    expect(wrapper.get(".activity-editor-delete-button").text()).toBe(
      "Delete unfilled time",
    );
    await wrapper.get(".activity-editor-delete-button").trigger("click");
    expect(store.getActivitiesForDay(day)[0].duration_minutes).toBe(60);
    expect(
      wrapper.get(".activity-editor-delete-confirmation").text(),
    ).toContain("preceding Office · Legacy activity will fill it");
    await wrapper.get(".activity-editor-confirm-delete").trigger("click");

    expect(store.getActivitiesForDay(day)).toMatchObject([
      { id: 1, start_time_minutes: 60, duration_minutes: 120 },
      { id: 2, start_time_minutes: 180, duration_minutes: 60 },
    ]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("requires inline confirmation before deleting an activity", async () => {
    const store = useActivityStore();
    const wrapper = mountEditor();

    await wrapper.get(".activity-editor-delete-button").trigger("click");
    expect(store.activities.map(({ id }) => id)).toEqual([1, 2]);
    expect(
      wrapper.get(".activity-editor-delete-confirmation").text(),
    ).toContain("This cannot be undone");
    await wrapper.get(".activity-editor-confirm-delete").trigger("click");

    expect(store.activities.map(({ id }) => id)).toEqual([2]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("cancels deletion inline without closing or mutating", async () => {
    const store = useActivityStore();
    const wrapper = mount(ActivityTagEditor, {
      attachTo: document.body,
      props: { activity: store.activities[0] },
    });
    await wrapper.get(".activity-editor-delete-button").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Cancel deletion")!
      .trigger("click");

    expect(store.activities.map(({ id }) => id)).toEqual([1, 2]);
    expect(wrapper.find(".activity-editor-delete-confirmation").exists()).toBe(
      false,
    );
    expect(wrapper.emitted("close")).toBeUndefined();
    expect(document.activeElement).toBe(
      wrapper.get(".activity-editor-delete-button").element,
    );
    wrapper.unmount();
  });

  it("closes on Cancel, Escape, or backdrop without deleting", async () => {
    const store = useActivityStore();
    const cancelWrapper = mountEditor();
    await cancelWrapper.get(".activity-editor-delete-button").trigger("click");
    await cancelWrapper
      .findAll("button")
      .find((button) => button.text() === "Cancel")!
      .trigger("click");
    expect(cancelWrapper.emitted("close")).toHaveLength(1);

    const wrapper = mountEditor();
    await wrapper.get(".activity-editor-delete-button").trigger("click");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("close")).toHaveLength(1);

    const backdropWrapper = mountEditor();
    await backdropWrapper
      .get(".activity-editor-delete-button")
      .trigger("click");
    await backdropWrapper.get(".activity-editor-backdrop").trigger("click");
    expect(backdropWrapper.emitted("close")).toHaveLength(1);
    expect(store.activities.map(({ id }) => id)).toEqual([1, 2]);
  });
});
