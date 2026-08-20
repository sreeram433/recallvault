import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, searchItems } from "./search";
import type { HydratedItem } from "./types";

function item(partial: Partial<HydratedItem> & Pick<HydratedItem, "id" | "title">): HydratedItem {
  return {
    userId: "u",
    sourceUrl: "https://instagram.com/reel/x",
    canonicalUrl: "https://instagram.com/reel/x",
    sourceType: "instagram_reel",
    savedAt: "2026-01-15T00:00:00.000Z",
    openCount: 0,
    availabilityStatus: "saved",
    isFavorite: false,
    isPinned: false,
    isArchived: false,
    needsReview: false,
    collections: [],
    tags: [],
    ...partial,
  };
}

describe("searchItems", () => {
  const items = [
    item({
      id: "1",
      title: "Python chatbot",
      userNote: "Use this for my ML project",
      creatorName: "codewitharjun",
      tags: [{ id: "t1", userId: "u", name: "python", slug: "python", createdAt: "" }],
    }),
    item({
      id: "2",
      title: "Hyderabad cafes with outdoor seating",
      userNote: "Weekend list",
      creatorName: "hydfoodwalks",
      savedAt: "2026-07-01T00:00:00.000Z",
      collections: [
        {
          id: "c1",
          userId: "u",
          name: "Travel",
          slug: "travel",
          color: "#000",
          isSystem: false,
          createdAt: "",
          updatedAt: "",
        },
      ],
    }),
  ];

  it("finds by note keywords and explains the match", () => {
    const results = searchItems(items, { ...EMPTY_FILTERS, query: "ML project" });
    expect(results[0]?.id).toBe("1");
    expect(results[0]?.matchReasons?.some((r) => r.toLowerCase().includes("note"))).toBe(true);
  });

  it("finds place + seating language", () => {
    const results = searchItems(items, {
      ...EMPTY_FILTERS,
      query: "Hyderabad cafes with outdoor seating",
    });
    expect(results.some((r) => r.id === "2")).toBe(true);
  });
});
