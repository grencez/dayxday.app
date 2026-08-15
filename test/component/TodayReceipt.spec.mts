import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TodayReceipt from "@/component/TodayReceipt.vue";

const receipt = {
  elapsedMinutes: 600,
  trackedMinutes: 90,
  untrackedMinutes: 510,
  coveragePercent: 15,
  groupedTotals: [
    {
      id: "work",
      name: "Work",
      tags: [{ id: "focus", name: "Focus", minutes: 90 }],
    },
  ],
  segments: [
    {
      key: "one",
      tagIds: ["focus"],
      title: "Focus",
      startMs: new Date(2024, 4, 10, 9).getTime(),
      endMs: new Date(2024, 4, 10, 10, 30).getTime(),
      durationMinutes: 90,
      ongoing: true,
    },
  ],
};

describe("TodayReceipt", () => {
  it("renders grouped per-tag totals and chronological segment titles", () => {
    const wrapper = mount(TodayReceipt, { props: { receipt } });
    expect(wrapper.text()).toContain("15% tracked");
    expect(wrapper.get(".tag-total-group").text()).toContain("Work");
    expect(wrapper.get(".tag-total-group").text()).toContain("Focus");
    expect(wrapper.get(".receipt-segments").text()).toContain("Current");
  });

  it("explains an empty receipt", () => {
    const wrapper = mount(TodayReceipt, {
      props: {
        receipt: {
          ...receipt,
          groupedTotals: [],
          segments: [],
          trackedMinutes: 0,
        },
      },
    });
    expect(wrapper.text()).toContain("No tracked time yet.");
  });
});
