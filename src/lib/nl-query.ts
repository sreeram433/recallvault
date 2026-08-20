import { endOfDay, startOfDay } from "./dates";
import type { ParsedNaturalQuery, SourceType } from "./types";

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const SOURCE_PHRASES: Array<{ pattern: RegExp; type: SourceType }> = [
  { pattern: /\breels?\b/i, type: "instagram_reel" },
  { pattern: /\bcarousels?\b/i, type: "instagram_carousel" },
  { pattern: /\bstories\b|\bstory\b/i, type: "instagram_story" },
  { pattern: /\bprofiles?\b/i, type: "instagram_profile" },
  { pattern: /\bposts?\b/i, type: "instagram_post" },
];

function monthRange(month: number, year: number): { from: string; to: string } {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
}

export function parseNaturalQuery(raw: string, now = new Date()): ParsedNaturalQuery {
  let text = raw.trim();
  const sourceTypes: SourceType[] = [];
  let savedFrom: string | undefined;
  let savedTo: string | undefined;
  let creator: string | undefined;
  let favoritesOnly = false;
  let neverOpened = false;

  const creatorNamed = text.match(
    /\bcreator(?:\s+named)?\s+[“"']?(@?[A-Za-z0-9._]{2,})[”"']?/i,
  );
  const fromBy = text.match(
    /\b(?:from|by)\s+(?!a\b|an\b|the\b)[“"']?(@?[A-Za-z0-9._]{2,})[”"']?/i,
  );
  const creatorMatch = creatorNamed ?? fromBy;
  if (creatorMatch) {
    creator = creatorMatch[1].replace(/^@/, "");
    text = text.replace(creatorMatch[0], " ");
  }

  if (/\b(favorite|favourites|starred)\b/i.test(text)) {
    favoritesOnly = true;
    text = text.replace(/\b(favorite|favourites|starred)s?\b/gi, " ");
  }

  if (/\b(never opened|unopened|stale|not opened)\b/i.test(text)) {
    neverOpened = true;
    text = text.replace(/\b(never opened|unopened|stale|not opened)\b/gi, " ");
  }

  for (const { pattern, type } of SOURCE_PHRASES) {
    if (pattern.test(text)) {
      sourceTypes.push(type);
      text = text.replace(pattern, " ");
    }
  }

  const lastN = text.match(/\blast\s+(\d+)\s+(day|days|week|weeks|month|months)\b/i);
  if (lastN) {
    const n = Number(lastN[1]);
    const unit = lastN[2].toLowerCase();
    const from = new Date(now);
    if (unit.startsWith("day")) from.setDate(from.getDate() - n);
    if (unit.startsWith("week")) from.setDate(from.getDate() - n * 7);
    if (unit.startsWith("month")) from.setMonth(from.getMonth() - n);
    savedFrom = startOfDay(from).toISOString();
    savedTo = endOfDay(now).toISOString();
    text = text.replace(lastN[0], " ");
  } else if (/\blast week\b/i.test(text)) {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    savedFrom = startOfDay(from).toISOString();
    savedTo = endOfDay(now).toISOString();
    text = text.replace(/\blast week\b/gi, " ");
  } else if (/\blast month\b/i.test(text)) {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 1);
    savedFrom = startOfDay(from).toISOString();
    savedTo = endOfDay(now).toISOString();
    text = text.replace(/\blast month\b/gi, " ");
  } else if (/\bthis year\b/i.test(text)) {
    savedFrom = startOfDay(new Date(now.getFullYear(), 0, 1)).toISOString();
    savedTo = endOfDay(now).toISOString();
    text = text.replace(/\bthis year\b/gi, " ");
  } else if (/\baround january\b|\bin january\b|\bjanuary\b/i.test(text)) {
    const monthMatch = text.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i,
    );
    if (monthMatch) {
      const month = MONTHS[monthMatch[1].toLowerCase()];
      let year = now.getFullYear();
      if (month > now.getMonth()) year -= 1;
      const range = monthRange(month, year);
      savedFrom = range.from;
      savedTo = range.to;
      text = text.replace(
        new RegExp(`\\b(around|in)?\\s*${monthMatch[1]}\\b`, "i"),
        " ",
      );
    }
  }

  const ago = text.match(/\b(\d+)\s+(day|days|week|weeks|month|months)\s+ago\b/i);
  if (ago && !savedFrom) {
    const n = Number(ago[1]);
    const unit = ago[2].toLowerCase();
    const center = new Date(now);
    if (unit.startsWith("day")) center.setDate(center.getDate() - n);
    if (unit.startsWith("week")) center.setDate(center.getDate() - n * 7);
    if (unit.startsWith("month")) center.setMonth(center.getMonth() - n);
    const from = new Date(center);
    from.setDate(from.getDate() - 10);
    const to = new Date(center);
    to.setDate(to.getDate() + 10);
    savedFrom = startOfDay(from).toISOString();
    savedTo = endOfDay(to).toISOString();
    text = text.replace(ago[0], " ");
  }

  text = text
    .replace(/\b(saved|reel|reels|that|the|a|an|i|my|for|with|from)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    text,
    savedFrom,
    savedTo,
    sourceTypes: Array.from(new Set(sourceTypes)),
    creator,
    favoritesOnly,
    neverOpened,
  };
}
