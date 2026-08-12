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
});
