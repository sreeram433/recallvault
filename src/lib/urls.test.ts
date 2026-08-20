import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  detectSourceType,
  extractUrlFromShareText,
  identityKey,
  inferCreatorFromUrl,
} from "./urls";

describe("canonicalizeUrl", () => {
  it("strips tracking params and www", () => {
    expect(
      canonicalizeUrl("https://www.instagram.com/reel/ABC123/?igsh=zzz&utm_source=ig"),
    ).toBe("https://instagram.com/reel/ABC123");
  });

  it("normalizes /reels/ to /reel/", () => {
    expect(canonicalizeUrl("https://instagram.com/reels/XYZ/")).toBe(
      "https://instagram.com/reel/XYZ",
    );
  });

  it("rejects non-http schemes", () => {
    expect(canonicalizeUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("detectSourceType", () => {
  it("detects reels, posts, stories, profiles, and web", () => {
    expect(detectSourceType("https://instagram.com/reel/ABC")).toBe("instagram_reel");
    expect(detectSourceType("https://instagram.com/p/ABC")).toBe("instagram_post");
    expect(detectSourceType("https://instagram.com/p/ABC?img_index=2")).toBe(
      "instagram_carousel",
    );
    expect(detectSourceType("https://instagram.com/stories/naina/1")).toBe(
      "instagram_story",
    );
    expect(detectSourceType("https://instagram.com/hydfoodwalks")).toBe(
      "instagram_profile",
    );
    expect(detectSourceType("https://thekitchn.com/dal")).toBe("web_link");
  });
});

describe("inferCreatorFromUrl", () => {
  it("reads story and profile usernames", () => {
    expect(inferCreatorFromUrl("https://instagram.com/stories/naina/9")).toBe("naina");
    expect(inferCreatorFromUrl("https://instagram.com/hydfoodwalks")).toBe("hydfoodwalks");
  });
});

describe("identityKey", () => {
  it("treats /reel and /p shortcodes as the same item", () => {
    expect(identityKey("https://instagram.com/reel/ABCDE12345")).toBe(
      identityKey("https://www.instagram.com/p/ABCDE12345/?igsh=1"),
    );
  });

  it("unwraps l.instagram.com redirects", () => {
    const wrapped =
      "https://l.instagram.com/?u=" +
      encodeURIComponent("https://www.instagram.com/reel/ABCDE12345/");
    expect(identityKey(wrapped)).toBe("ig:shortcode:ABCDE12345");
  });
});

describe("extractUrlFromShareText", () => {
  it("pulls the first http url out of share text", () => {
    expect(
      extractUrlFromShareText("Check this https://instagram.com/reel/ABC/ wow"),
    ).toBe("https://instagram.com/reel/ABC/");
  });
});
