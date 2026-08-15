import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import App from "@/App.vue";

describe("App.vue", () => {
  it("does not expose the destructive developer controls", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,
          RouterLink: { template: "<a><slot /></a>" },
        },
      },
    });

    expect(wrapper.text()).not.toContain("Populate Store");
    expect(wrapper.findAll("button")).toHaveLength(0);
    expect(wrapper.text()).toContain("Today");
    expect(wrapper.text()).toContain("Tags");
  });
});
