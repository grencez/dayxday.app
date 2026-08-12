import { mount } from "@vue/test-utils";
import Activity from "@/asset/component/Activity.vue";
import { describe, it, expect } from "vitest";

describe("Activity.vue", () => {
  it("renders the activity name", () => {
    const activity = {
      id: 1,
      name: "Test Activity",
      startTime: 0,
      duration: 60,
    };
    const wrapper = mount(Activity, {
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
    const wrapper = mount(Activity, {
      props: {
        activity: activity,
      },
    });
    expect(wrapper.props().activity).toEqual(activity);
  });
});
