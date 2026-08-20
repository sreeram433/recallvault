import { extractUrlFromShareText, isInstagramUrl, safeUrl } from "./urls";

const SAVED_KEYS = /saved(_saved_media|_posts|_collections|_clips|_igtv)?/i;

export function extractUrlsFromExportPayload(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const saved = pickSavedNodes(parsed);
  if (!saved.length) return [];
  const urls = new Set<string>();
  for (const node of saved) walkSaved(node, urls);
  return Array.from(urls);
}

function pickSavedNodes(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => pickSavedNodes(entry));
  }
  const record = value as Record<string, unknown>;
  const matched: unknown[] = [];
  for (const [key, entry] of Object.entries(record)) {
    if (SAVED_KEYS.test(key)) matched.push(entry);
  }
  return matched;
}

function walkSaved(value: unknown, urls: Set<string>) {
  if (typeof value === "string") {
    const url = safeUrl(value) ?? safeUrl(extractUrlFromShareText(value) ?? "");
    if (url && isInstagramUrl(url.toString())) urls.add(url.toString());
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => walkSaved(entry, urls));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (/href|uri|url|link/i.test(key) && typeof entry === "string") {
        walkSaved(entry, urls);
      } else if (typeof entry === "object") {
        walkSaved(entry, urls);
      }
    }
  }
}
