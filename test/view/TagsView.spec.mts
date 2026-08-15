import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import TagsView from "@/view/TagsView.vue";
import { useActivityStore } from "@/store/activity";

describe("TagsView", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("creates a group with an initial tag and configures exclusivity", async () => {
    const wrapper = mount(TagsView);
    const inputs = wrapper.findAll(".create-group input");
    await inputs[0].setValue("Work");
    await inputs[1].setValue("Focus");
    await wrapper.get(".create-group").trigger("submit");
    const store = useActivityStore();
    expect(store.tagGroups[0]).toMatchObject({
      name: "Work",
      tags: [{ name: "Focus" }],
    });
    await wrapper.get(".exclusive-control input").setValue(true);
    expect(store.tagGroups[0].exclusive).toBe(true);
  });

  it("adds, archives, renames, restores, and reorders tags", async () => {
    const store = useActivityStore();
    store.createGroup("Work", "Focus");
    store.addTag(store.tagGroups[0].id, "Meeting");
    const wrapper = mount(TagsView);
    const archive = wrapper
      .findAll("button")
      .find((button) => button.text() === "Archive")!;
    await archive.trigger("click");
    expect(wrapper.find(".archived-tags").exists()).toBe(true);
    const archivedInput = wrapper.get(
      '[aria-label="Rename archived tag Focus"]',
    );
    await archivedInput.setValue("Deep work");
    await archivedInput.trigger("change");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Restore")!
      .trigger("click");
    expect(store.tagGroups[0].tags[0]).toMatchObject({ name: "Deep work" });
    expect(store.tagGroups[0].tags[0].archived).toBeUndefined();
    store.moveTag(store.tagGroups[0].id, store.tagGroups[0].tags[1].id, -1);
    expect(store.tagGroups[0].tags.map((tag) => tag.name)).toEqual([
      "Meeting",
      "Deep work",
    ]);
  });

  it("reorders relative to visible active tags while skipping archived tags", async () => {
    const store = useActivityStore();
    store.createGroup("Work", "Focus");
    const groupId = store.tagGroups[0].id;
    store.addTag(groupId, "Hidden");
    store.addTag(groupId, "Meeting");
    store.archiveTag(store.tagGroups[0].tags[1].id);
    const wrapper = mount(TagsView);

    expect(
      wrapper.get('[aria-label="Move Focus up"]').attributes(),
    ).toHaveProperty("disabled");
    expect(
      wrapper.get('[aria-label="Move Meeting down"]').attributes(),
    ).toHaveProperty("disabled");
    await wrapper.get('[aria-label="Move Meeting up"]').trigger("click");

    expect(
      store.tagGroups[0].tags
        .filter((tag) => tag.archived !== true)
        .map((tag) => tag.name),
    ).toEqual(["Meeting", "Focus"]);
    expect(store.tagGroups[0].tags[1]).toMatchObject({
      name: "Hidden",
      archived: true,
    });
    expect(
      wrapper.get('[aria-label="Move Meeting up"]').attributes(),
    ).toHaveProperty("disabled");
  });

  it("rejects case-insensitive duplicates including archived tags", async () => {
    const store = useActivityStore();
    store.createGroup("Work", "Focus");
    store.archiveTag(store.tagGroups[0].tags[0].id);
    const wrapper = mount(TagsView);
    const formInputs = wrapper.findAll(".create-group input");
    await formInputs[0].setValue("Other");
    await formInputs[1].setValue(" focus ");
    await wrapper.get(".create-group").trigger("submit");
    expect(store.tagGroups).toHaveLength(1);
    expect(wrapper.get('[role="status"]').text()).toContain("globally unique");
  });
});
