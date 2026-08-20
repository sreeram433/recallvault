import { describe, expect, it } from "vitest";
import { extractUrlsFromExportPayload } from "./instagram-export";

describe("extractUrlsFromExportPayload", () => {
  it("walks Instagram-style JSON", () => {
    const raw = JSON.stringify({
      saved_saved_media: [
        { title: "x", string_list_data: [{ href: "https://www.instagram.com/reel/AAA/" }] },
      ],
    });
    expect(extractUrlsFromExportPayload(raw)).toEqual([
      "https://www.instagram.com/reel/AAA/",
    ]);
  });

  it("ignores non-instagram urls", () => {
    const raw = JSON.stringify({ href: "https://example.com" });
    expect(extractUrlsFromExportPayload(raw)).toEqual([]);
  });

  it("does not harvest DM or follower links", () => {
    const raw = JSON.stringify({
      messages: [{ href: "https://www.instagram.com/reel/DMONLY12/" }],
      followers: [{ href: "https://www.instagram.com/someone/" }],
    });
    expect(extractUrlsFromExportPayload(raw)).toEqual([]);
  });
});
