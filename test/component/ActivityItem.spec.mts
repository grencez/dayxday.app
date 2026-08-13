import { mount } from "@vue/test-utils";
import ActivityItem from "@/component/ActivityItem.vue";
import { describe, it, expect } from "vitest";

describe("ActivityItem.vue", () => {
  it("renders the activity name", () => {
    const activity = {
      id: 1,
      name: "Test Activity",
      startTime: 0,
      duration: 60,
    };
    const wrapper = mount(ActivityItem, {
      props: {
        activity: activity,
      },
    });
    expect(wrapper.text()).toContain("Test Activity");
  });

  it("renders with the correct props", () => {
    const activity = {
      id: 2,
      name: "Another Activity",
      startTime: 100,
      duration: 120,
    };
    const wrapper = mount(ActivityItem, {
      props: {
        activity: activity,
      },
    });
    expect(wrapper.props().activity).toEqual(activity);
  });

  it("becomes editable on double click", async () => {
    const activity = {
      id: 3,
      name: "Editable",
      start_time_minutes: 0,
      duration_minutes: 60,
    };
    const wrapper = mount(ActivityItem, { props: { activity } });
    await wrapper.trigger("dblclick");
    expect((wrapper.element as HTMLElement).contentEditable).toBe("true");
  });

  it("emits rename with the trimmed name on blur after editing", async () => {
    const activity = {
      id: 4,
      name: "Old Name",
      start_time_minutes: 0,
      duration_minutes: 60,
    };
    const wrapper = mount(ActivityItem, { props: { activity } });
    await wrapper.trigger("dblclick");
    wrapper.element.textContent = "  New Name  ";
    await wrapper.trigger("blur");
    expect(wrapper.emitted("rename")).toEqual([[{ id: 4, name: "New Name" }]]);
    expect((wrapper.element as HTMLElement).contentEditable).toBe("false");
  });

  it("commits the rename on Enter", async () => {
    const activity = {
      id: 5,
      name: "Before",
      start_time_minutes: 0,
      duration_minutes: 60,
    };
    const wrapper = mount(ActivityItem, { props: { activity } });
    await wrapper.trigger("dblclick");
    wrapper.element.textContent = "After";
    await wrapper.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("rename")).toEqual([[{ id: 5, name: "After" }]]);
    expect((wrapper.element as HTMLElement).contentEditable).toBe("false");
  });

  it("does not emit rename when the name is unchanged", async () => {
    const activity = {
      id: 6,
      name: "Unchanged",
      start_time_minutes: 0,
      duration_minutes: 60,
    };
    const wrapper = mount(ActivityItem, { props: { activity } });
    await wrapper.trigger("dblclick");
    wrapper.element.textContent = "Unchanged";
    await wrapper.trigger("blur");
    expect(wrapper.emitted("rename")).toBeUndefined();
  });

  it("restores the name and does not emit when cleared", async () => {
    const activity = {
      id: 7,
      name: "Keep Me",
      start_time_minutes: 0,
      duration_minutes: 60,
    };
    const wrapper = mount(ActivityItem, { props: { activity } });
    await wrapper.trigger("dblclick");
    wrapper.element.textContent = "   ";
    await wrapper.trigger("blur");
    expect(wrapper.emitted("rename")).toBeUndefined();
    expect(wrapper.element.textContent).toBe("Keep Me");
  });

  it("cancels the edit on Escape", async () => {
    const activity = {
      id: 8,
      name: "Original",
      start_time_minutes: 0,
      duration_minutes: 60,
    };
    const wrapper = mount(ActivityItem, { props: { activity } });
    await wrapper.trigger("dblclick");
    wrapper.element.textContent = "Abandoned";
    await wrapper.trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("rename")).toBeUndefined();
    expect(wrapper.element.textContent).toBe("Original");
    expect((wrapper.element as HTMLElement).contentEditable).toBe("false");
  });
});
