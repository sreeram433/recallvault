import { describe, expect, it } from "vitest";
import {
  classifyShareContent,
  isPrivateHostname,
  parseSharedText,
  ShareValidationError,
  validateShareTargetUrl,
} from "./validate";

describe("validateShareTargetUrl", () => {
  it("accepts an Instagram reel and classifies it without fetching", () => {
    const result = validateShareTargetUrl(
      "https://www.instagram.com/reel/ABCDE12345/?igsh=zzz&utm_source=ig",
    );
    expect(result.contentType).toBe("reel");
    expect(result.sourcePlatform).toBe("instagram");
    expect(result.provenance).toBe("user_shared");
    expect(result.canonicalUrl).toBe("https://instagram.com/reel/ABCDE12345");
  });

  it("classifies posts, stories, and profiles from the path only", () => {
    expect(validateShareTargetUrl("https://instagram.com/p/ABCDE12345").contentType).toBe("post");
    expect(validateShareTargetUrl("https://instagram.com/stories/naina/9").contentType).toBe("story");
    expect(validateShareTargetUrl("https://instagram.com/hydfoodwalks").contentType).toBe("profile");
    expect(validateShareTargetUrl("https://example.com/page").contentType).toBe("unknown");
    expect(validateShareTargetUrl("https://example.com/page").sourcePlatform).toBe("web");
  });

  it("rejects dangerous schemes and credentials", () => {
    expect(() => validateShareTargetUrl("javascript:alert(1)")).toThrow(ShareValidationError);
    expect(() => validateShareTargetUrl("file:///etc/passwd")).toThrow(ShareValidationError);
    expect(() => validateShareTargetUrl("https://user:pass@instagram.com/reel/ABCDE12345")).toThrow(
      /password/i,
    );
  });

  it("rejects localhost and private IPs without resolving DNS", () => {
    expect(() => validateShareTargetUrl("http://127.0.0.1/secret")).toThrow(/private/i);
    expect(() => validateShareTargetUrl("http://localhost:3000/x")).toThrow(/private/i);
    expect(() => validateShareTargetUrl("http://192.168.1.9/x")).toThrow(/private/i);
    expect(() => validateShareTargetUrl("http://10.0.0.8/x")).toThrow(/private/i);
    expect(() => validateShareTargetUrl("http://169.254.169.254/latest/meta-data")).toThrow(/private/i);
    expect(() => validateShareTargetUrl("http://[::1]/")).toThrow(/private/i);
  });

  it("rejects oversized input", () => {
    expect(() => validateShareTargetUrl(`https://instagram.com/${"a".repeat(3000)}`)).toThrow(/long/i);
  });
});

describe("parseSharedText", () => {
  it("extracts the first http URL from Instagram share text", () => {
    const result = parseSharedText(
      "Check out this Reel https://www.instagram.com/reel/ABCDE12345/?igsh=1",
    );
    expect(result.contentType).toBe("reel");
  });

  it("fails when no URL is present", () => {
    expect(() => parseSharedText("just a caption")).toThrow(/No http/i);
  });
});

describe("isPrivateHostname", () => {
  it("flags local and link-local names", () => {
    expect(isPrivateHostname("localhost")).toBe(true);
    expect(isPrivateHostname("printer.local")).toBe(true);
    expect(isPrivateHostname("instagram.com")).toBe(false);
  });
});

describe("classifyShareContent", () => {
  it("maps library source types to share-sheet labels", () => {
    expect(classifyShareContent("instagram_reel")).toBe("reel");
    expect(classifyShareContent("instagram_carousel")).toBe("post");
    expect(classifyShareContent("web_link")).toBe("unknown");
  });
});
