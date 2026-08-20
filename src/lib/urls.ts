import type { SourceType } from "./types";

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
  "l.instagram.com",
]);

export function safeUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return unwrapInstagramRedirect(url);
  } catch {
    return null;
  }
}

function unwrapInstagramRedirect(url: URL): URL {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "l.instagram.com") {
    const nested = url.searchParams.get("u");
    if (nested) {
      try {
        return new URL(nested);
      } catch {
        return url;
      }
    }
  }
  return url;
}

export function instagramShortcode(input: string): string | undefined {
  const url = safeUrl(input);
  if (!url) return undefined;
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host !== "instagram.com") return undefined;
  const parts = url.pathname.split("/").filter(Boolean);
  const markers = new Set(["reel", "reels", "p", "tv"]);
  for (let i = 0; i < parts.length; i += 1) {
    if (markers.has(parts[i].toLowerCase()) && parts[i + 1]) {
      const code = parts[i + 1].replace(/[^\w-]/g, "");
      if (code.length >= 5 && code.length <= 24) return code;
    }
  }
  return undefined;
}

export function identityKey(input: string): string | null {
  const canonical = canonicalizeUrl(input);
  if (!canonical) return null;
  const code = instagramShortcode(canonical);
  if (code) return `ig:shortcode:${code}`;
  const url = safeUrl(canonical);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "instagram.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "stories" && parts[1]) {
      return `ig:story:${parts[1].toLowerCase()}:${parts[2] ?? "latest"}`;
    }
    if (parts.length === 1 && !RESERVED_IG_PATHS.has(parts[0].toLowerCase())) {
      return `ig:profile:${parts[0].toLowerCase()}`;
    }
    return `ig:url:${canonical}`;
  }
  return `web:${canonical}`;
}

export function canonicalizeUrl(input: string): string | null {
  const url = safeUrl(input);
  if (!url) return null;
  url.hash = "";
  url.username = "";
  url.password = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
  }
  if (url.hostname === "m.instagram.com" || url.hostname === "l.instagram.com") {
    url.hostname = "instagram.com";
  }
  [
    "igsh",
    "igshid",
    "igshid=",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "ig_rid",
    "img_index",
  ].forEach((key) => url.searchParams.delete(key));
  let path = url.pathname.replace(/\/+$/, "");
  path = path.replace(/^\/reels\//, "/reel/");
  const code = instagramShortcode(`${url.protocol}//${url.hostname}${path}`);
  if (code && /^\/p\//i.test(path)) {
    path = `/p/${code}`;
  }
  url.pathname = path || "/";
  const query = url.searchParams.toString();
  return `${url.protocol}//${url.hostname}${url.pathname}${query ? `?${query}` : ""}`;
}

export function detectSourceType(input: string): SourceType {
  const url = safeUrl(input);
  if (!url) return "web_link";
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (!INSTAGRAM_HOSTS.has(host) && host !== "instagram.com") {
    return "web_link";
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (/^\/reel\//i.test(path) || /^\/reels\//i.test(path)) return "instagram_reel";
  if (/^\/stories\//i.test(path) || /^\/s\//i.test(path)) return "instagram_story";
  if (/^\/p\//i.test(path)) {
    if (url.searchParams.get("img_index")) return "instagram_carousel";
    return "instagram_post";
  }
  if (/^\/[^/]+\/p\//i.test(path)) return "instagram_post";
  if (/^\/[^/]+\/reel\//i.test(path)) return "instagram_reel";
  if (/^\/(explore|direct|accounts)/i.test(path)) return "instagram_other";
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 1 && !RESERVED_IG_PATHS.has(parts[0].toLowerCase())) {
    return "instagram_profile";
  }
  return "instagram_other";
}

const RESERVED_IG_PATHS = new Set([
  "reel",
  "reels",
  "p",
  "stories",
  "explore",
  "direct",
  "accounts",
  "tv",
  "about",
  "legal",
]);

export function inferCreatorFromUrl(input: string): string | undefined {
  const url = safeUrl(input);
  if (!url) return undefined;
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host !== "instagram.com") return undefined;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "stories" && parts[1]) return parts[1];
  if (
    parts.length === 1 &&
    !RESERVED_IG_PATHS.has(parts[0].toLowerCase())
  ) {
    return parts[0];
  }
  if (
    parts.length >= 3 &&
    (parts[1] === "reel" || parts[1] === "p") &&
    !RESERVED_IG_PATHS.has(parts[0].toLowerCase())
  ) {
    return parts[0];
  }
  return undefined;
}

export function sourceTypeLabel(type: SourceType): string {
  switch (type) {
    case "instagram_reel":
      return "Reel";
    case "instagram_post":
      return "Post";
    case "instagram_carousel":
      return "Carousel";
    case "instagram_profile":
      return "Profile";
    case "instagram_story":
      return "Story";
    case "instagram_other":
      return "Instagram";
    case "web_link":
      return "Web";
  }
}

export function extractUrlFromShareText(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[).,]+$/, "") : null;
}

export function isInstagramUrl(input: string): boolean {
  const url = safeUrl(input);
  if (!url) return false;
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  return host === "instagram.com";
}

export function displayHost(input: string): string {
  const url = safeUrl(input);
  return url ? url.hostname.replace(/^www\./, "") : input;
}
