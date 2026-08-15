import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TodayReceipt from "@/component/TodayReceipt.vue";
import type { TodayReceipt as TodayReceiptData } from "@/function/buildTodayReceipt";

describe("TodayReceipt", () => {
  it("renders coverage, totals, chronological segments, and the current marker", () => {
    const startMs = new Date(2024, 4, 10, 9).getTime();
    const receipt: TodayReceiptData = {
      elapsedMinutes: 600,
      trackedMinutes: 150,
      untrackedMinutes: 450,
      coveragePercent: 25,
      totals: [
        { name: "Focus", minutes: 90 },
        { name: "Email", minutes: 60 },
      ],
      segments: [
        {
          key: "activity:1",
          name: "Email",
          startMs,
          endMs: startMs + 60 * 60_000,
          durationMinutes: 60,
          ongoing: false,
        },
        {
          key: "running:2",
          name: "Focus",
          startMs: startMs + 90 * 60_000,
          endMs: startMs + 180 * 60_000,
          durationMinutes: 90,
          ongoing: true,
        },
      ],
    };

    const wrapper = mount(TodayReceipt, { props: { receipt } });

    expect(wrapper.get(".coverage-percent").text()).toBe("25% tracked");
    expect(wrapper.get("progress").attributes("aria-label")).toBe(
      "25% of today tracked",
    );
    expect(wrapper.findAll(".activity-totals li")[0].text()).toContain("Focus");
    expect(wrapper.findAll(".receipt-segments li")).toHaveLength(2);
    expect(wrapper.findAll(".receipt-segments li")[1].text()).toContain("Now");
    expect(wrapper.findAll(".receipt-segments li")[1].text()).toContain(
      "Current",
    );
  });

  it("explains an empty receipt", () => {
    const wrapper = mount(TodayReceipt, {
      props: {
        receipt: {
          segments: [],
          totals: [],
          elapsedMinutes: 300,
          trackedMinutes: 0,
          untrackedMinutes: 300,
          coveragePercent: 0,
        },
      },
    });

    expect(wrapper.text()).toContain("No tracked time yet.");
    expect(wrapper.text()).toContain(
      "Completed and current activities will appear here.",
    );
  });
});
