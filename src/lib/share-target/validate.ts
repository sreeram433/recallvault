import {
  canonicalizeUrl,
  detectSourceType,
  extractUrlFromShareText,
  identityKey,
  safeUrl,
} from "../urls";
import type { SourceType } from "../types";

export const MAX_SHARE_TEXT_LENGTH = 8_192;
export const MAX_URL_LENGTH = 2_048;
export const MAX_TITLE_LENGTH = 200;
export const MAX_NOTE_LENGTH = 2_000;
export const MAX_TAG_LENGTH = 48;
export const MAX_TAGS = 12;

export type ShareContentType = "post" | "reel" | "story" | "profile" | "unknown";

export type ShareValidationCode =
  | "empty"
  | "too_long"
  | "no_url"
  | "malformed"
  | "forbidden_scheme"
  | "credentials"
  | "private_host"
  | "not_http";

export interface ValidatedShareUrl {
  originalUrl: string;
  canonicalUrl: string;
  identityKey: string;
  contentType: ShareContentType;
  sourcePlatform: "instagram" | "web";
  sourceType: SourceType;
  provenance: "user_shared";
}

export class ShareValidationError extends Error {
  constructor(public code: ShareValidationCode, message: string) {
    super(message);
    this.name = "ShareValidationError";
  }
}

const FORBIDDEN_SCHEMES = new Set([
  "file",
  "javascript",
  "data",
  "blob",
  "about",
  "intent",
  "content",
  "app",
  "ftp",
  "ws",
  "wss",
]);

export function extractFirstHttpUrl(shareText: string): string | null {
  if (!shareText.trim()) return null;
  if (shareText.length > MAX_SHARE_TEXT_LENGTH) return null;
  return extractUrlFromShareText(shareText) ?? (looksLikeBareUrl(shareText) ? shareText.trim() : null);
}

function looksLikeBareUrl(value: string): boolean {
  return /^(https?:\/\/|instagram\.com\/|www\.instagram\.com\/)/i.test(value.trim());
}

export function classifyShareContent(sourceType: SourceType): ShareContentType {
  switch (sourceType) {
    case "instagram_reel":
      return "reel";
    case "instagram_post":
    case "instagram_carousel":
      return "post";
    case "instagram_story":
      return "story";
    case "instagram_profile":
      return "profile";
    default:
      return "unknown";
  }
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host === "localhost." ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "0" ||
    host === "metadata.google.internal"
  ) {
    return true;
  }
  return isPrivateIp(host);
}

export function isPrivateIp(address: string): boolean {
  if (/^127\./.test(address) || /^10\./.test(address) || /^192\.168\./.test(address)) return true;
  if (/^169\.254\./.test(address) || /^0\./.test(address) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(address)) {
    return true;
  }
  const parts = address.split(".");
  if (parts.length === 4) {
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  const lower = address.toLowerCase();
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80") ||
    lower.startsWith("::ffff:127.") ||
    lower.startsWith("::ffff:10.") ||
    lower.startsWith("::ffff:192.168.")
  );
}

export function validateShareTargetUrl(raw: string): ValidatedShareUrl {
  const trimmed = raw.trim();
  if (!trimmed) throw new ShareValidationError("empty", "Nothing was shared.");
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new ShareValidationError("too_long", "That link is too long to save.");
  }

  const scheme = trimmed.split(":", 1)[0]?.toLowerCase();
  if (scheme && FORBIDDEN_SCHEMES.has(scheme)) {
    throw new ShareValidationError("forbidden_scheme", "That kind of link cannot be saved.");
  }

  const url = safeUrl(trimmed);
  if (!url) {
    throw new ShareValidationError("malformed", "That does not look like a valid link.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ShareValidationError("not_http", "Only http and https links can be saved.");
  }
  if (url.username || url.password) {
    throw new ShareValidationError("credentials", "Links with usernames or passwords are rejected.");
  }
  if (isPrivateHostname(url.hostname)) {
    throw new ShareValidationError("private_host", "Private or local addresses cannot be saved.");
  }

  const canonical = canonicalizeUrl(url.toString());
  if (!canonical) {
    throw new ShareValidationError("malformed", "That link could not be normalized.");
  }
  const canonicalParsed = safeUrl(canonical);
  if (!canonicalParsed || isPrivateHostname(canonicalParsed.hostname)) {
    throw new ShareValidationError("private_host", "Private or local addresses cannot be saved.");
  }

  const sourceType = detectSourceType(canonical);
  const sourcePlatform = sourceType.startsWith("instagram_") ? "instagram" : "web";
  return {
    originalUrl: `${url.protocol}//${url.hostname}${url.pathname}${url.search}`,
    canonicalUrl: canonical,
    identityKey: identityKey(canonical) ?? canonical,
    contentType: classifyShareContent(sourceType),
    sourcePlatform,
    sourceType,
    provenance: "user_shared",
  };
}

export function parseSharedText(shareText: string): ValidatedShareUrl {
  if (!shareText.trim()) throw new ShareValidationError("empty", "Nothing was shared.");
  if (shareText.length > MAX_SHARE_TEXT_LENGTH) {
    throw new ShareValidationError("too_long", "Shared text is too long.");
  }
  const extracted = extractFirstHttpUrl(shareText);
  if (!extracted) throw new ShareValidationError("no_url", "No http(s) URL was found in the shared text.");
  return validateShareTargetUrl(extracted);
}

export function hashForAudit(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
