import { describe, expect, it } from "vitest";
import {
  canonicalTagIds,
  isValidSelection,
  normalizeSelection,
  selectionKey,
  selectionsEqual,
  selectionTitle,
  type TagGroup,
} from "@/function/tagSelection";

const groups: TagGroup[] = [
  {
    id: "context",
    tags: [
      { id: "office", name: "Office" },
      { id: "home", name: "Home" },
    ],
    exclusive: true,
  },
  {
    id: "kind",
    tags: [
      { id: "focus", name: "Focus" },
      { id: "planning", name: "Planning", archived: true },
    ],
  },
];

describe("tag selection identity", () => {
  it("uses set identity independent of selection and configuration order", () => {
    expect(selectionsEqual(["focus", "home"], ["home", "focus"])).toBe(true);
    expect(selectionKey(["focus", "home"])).toBe(
      selectionKey(["home", "focus"]),
    );
    expect(selectionKey(["focus", "home"])).toBe(
      selectionKey(["focus", "home", "focus"]),
    );
  });

  it("canonicalizes display by group then tag order", () => {
    expect(canonicalTagIds(["focus", "home"], groups)).toEqual([
      "home",
      "focus",
    ]);
    expect(selectionTitle(["focus", "home"], groups)).toBe("Home · Focus");
  });

  it("normalizes exclusive groups and filters archived tags for capture", () => {
    expect(
      normalizeSelection(["home", "office", "planning", "focus"], groups),
    ).toEqual(["office", "focus"]);
    expect(isValidSelection(["office", "home"], groups)).toBe(false);
    expect(isValidSelection(["planning"], groups)).toBe(false);
    expect(isValidSelection(["planning"], groups, false)).toBe(true);
    expect(isValidSelection([], groups)).toBe(false);
  });
});
