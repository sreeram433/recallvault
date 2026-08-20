import { describe, expect, it } from "vitest";
import { toCsv, toExportRecord, toJson, toMarkdown } from "./export";
import type { HydratedItem } from "./types";

const item: HydratedItem = {
  id: "1",
  userId: "u",
  sourceUrl: "https://instagram.com/reel/ABC",
  canonicalUrl: "https://instagram.com/reel/ABC",
  sourceType: "instagram_reel",
  creatorName: "kira",
  title: "Hooks",
  savedAt: "2026-01-01T00:00:00.000Z",
  openCount: 2,
  availabilityStatus: "saved",
  userNote: 'Try hook #2, "false start"',
  isFavorite: true,
  isPinned: false,
  isArchived: false,
  needsReview: false,
  collections: [
    {
      id: "c",
      userId: "u",
      name: "Editing Ideas",
      slug: "editing-ideas",
      color: "#000",
      isSystem: false,
      createdAt: "",
      updatedAt: "",
    },
  ],
  tags: [{ id: "t", userId: "u", name: "hook", slug: "hook", createdAt: "" }],
};

describe("export", () => {
  it("includes required metadata fields", () => {
    const record = toExportRecord(item);
    expect(record.url).toContain("instagram.com");
    expect(record.notes).toContain("hook");
    expect(record.tags).toBe("hook");
    expect(record.collections).toBe("Editing Ideas");
  });

  it("escapes csv quotes", () => {
    const csv = toCsv([toExportRecord(item)]);
    expect(csv).toContain('""false start""');
  });

  it("markdown states media is not included", () => {
    expect(toMarkdown([toExportRecord(item)])).toMatch(/not included/i);
  });

  it("json wraps a disclaimer", () => {
    const parsed = JSON.parse(toJson([toExportRecord(item)]));
    expect(parsed.disclaimer).toMatch(/not copied/i);
    expect(parsed.items).toHaveLength(1);
  });
});
