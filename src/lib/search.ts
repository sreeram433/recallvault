import MiniSearch from "minisearch";
import { inRange } from "./dates";
import { parseNaturalQuery } from "./nl-query";
import type {
  HydratedItem,
  SearchFilters,
  SortOption,
} from "./types";

export const EMPTY_FILTERS: SearchFilters = {
  query: "",
  sourceTypes: [],
  collectionIds: [],
  tagIds: [],
  creator: "",
  status: [],
  favoritesOnly: false,
  archived: "hide",
  neverOpened: false,
  sort: "newest",
};

interface SearchDoc {
  id: string;
  title: string;
  creatorName: string;
  userNote: string;
  captionText: string;
  transcriptText: string;
  tags: string;
  collections: string;
  sourceUrl: string;
  canonicalUrl: string;
}

function toDoc(item: HydratedItem): SearchDoc {
  return {
    id: item.id,
    title: item.title ?? "",
    creatorName: item.creatorName ?? "",
    userNote: item.userNote ?? "",
    captionText: item.captionText ?? "",
    transcriptText: item.transcriptText ?? "",
    tags: item.tags.map((t) => t.name).join(" "),
    collections: item.collections.map((c) => c.name).join(" "),
    sourceUrl: item.sourceUrl,
    canonicalUrl: item.canonicalUrl,
  };
}

export function buildSearchIndex(items: HydratedItem[]) {
  const mini = new MiniSearch<SearchDoc>({
    fields: [
      "title",
      "creatorName",
      "userNote",
      "captionText",
      "transcriptText",
      "tags",
      "collections",
      "sourceUrl",
      "canonicalUrl",
    ],
    storeFields: ["id"],
    searchOptions: {
      boost: {
        userNote: 3,
        title: 2.4,
        tags: 2.2,
        collections: 2,
        creatorName: 2,
        captionText: 1.4,
        transcriptText: 1.2,
      },
      prefix: true,
      fuzzy: 0.2,
    },
  });
  mini.addAll(items.map(toDoc));
  return mini;
}

export function matchReasons(item: HydratedItem, query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  const reasons: string[] = [];
  const push = (label: string, value?: string) => {
    if (!value) return;
    const lower = value.toLowerCase();
    if (tokens.some((t) => lower.includes(t))) {
      reasons.push(`${label}: “${clip(value)}”`);
    }
  };
  push("Note", item.userNote);
  push("Title", item.title);
  push("Creator", item.creatorName);
  push("Caption", item.captionText);
  push("Transcript", item.transcriptText);
  push("URL", item.sourceUrl);
  for (const tag of item.tags) push("Tag", tag.name);
  for (const col of item.collections) push("Collection", col.name);
  return Array.from(new Set(reasons)).slice(0, 4);
}

function clip(value: string, n = 72): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > n ? `${compact.slice(0, n - 1)}…` : compact;
}

function sortItems(items: HydratedItem[], sort: SortOption): HydratedItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    switch (sort) {
      case "oldest":
        return a.savedAt.localeCompare(b.savedAt);
      case "recently_opened":
        return (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? "");
      case "most_opened":
        return b.openCount - a.openCount;
      case "az":
        return (a.title || a.creatorName || a.canonicalUrl).localeCompare(
          b.title || b.creatorName || b.canonicalUrl,
        );
      case "relevance":
        return 0;
      case "newest":
      default:
        return b.savedAt.localeCompare(a.savedAt);
    }
  });
  return copy;
}

export function searchItems(
  items: HydratedItem[],
  filters: SearchFilters,
): HydratedItem[] {
  const parsed = parseNaturalQuery(filters.query);
  const text = parsed.text;
  let working = items.filter((item) => {
    if (filters.archived === "hide" && item.isArchived) return false;
    if (filters.archived === "only" && !item.isArchived) return false;
    if (filters.favoritesOnly || parsed.favoritesOnly) {
      if (!item.isFavorite) return false;
    }
    if (filters.neverOpened || parsed.neverOpened) {
      if (item.lastOpenedAt) return false;
    }
    const sourceTypes = [
      ...filters.sourceTypes,
      ...parsed.sourceTypes,
    ];
    if (sourceTypes.length && !sourceTypes.includes(item.sourceType)) return false;
    if (filters.status.length && !filters.status.includes(item.availabilityStatus)) {
      return false;
    }
    if (filters.collectionIds.length) {
      const ids = new Set(item.collections.map((c) => c.id));
      if (!filters.collectionIds.some((id) => ids.has(id))) return false;
    }
    if (filters.tagIds.length) {
      const ids = new Set(item.tags.map((t) => t.id));
      if (!filters.tagIds.some((id) => ids.has(id))) return false;
    }
    const creator = (filters.creator || parsed.creator || "").trim().toLowerCase();
    if (creator && !(item.creatorName ?? "").toLowerCase().includes(creator)) {
      return false;
    }
    const savedFrom = filters.savedFrom || parsed.savedFrom;
    const savedTo = filters.savedTo || parsed.savedTo;
    if (!inRange(item.savedAt, savedFrom, savedTo)) return false;
    if (!inRange(item.lastOpenedAt ?? "", filters.openedFrom, filters.openedTo)) {
      if (filters.openedFrom || filters.openedTo) return false;
    }
    return true;
  });

  if (text) {
    const index = buildSearchIndex(working);
    const hits = index.search(text);
    const byId = new Map(working.map((item) => [item.id, item]));
    if (hits.length) {
      const ranked: HydratedItem[] = [];
      for (const hit of hits) {
        const item = byId.get(hit.id);
        if (!item) continue;
        ranked.push({ ...item, matchReasons: matchReasons(item, text) });
      }
      working = ranked;
    } else {
      const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
      const matchedItems: HydratedItem[] = [];
      for (const item of working) {
        const blob = [
          item.title,
          item.creatorName,
          item.userNote,
          item.captionText,
          item.transcriptText,
          item.sourceUrl,
          ...item.tags.map((t) => t.name),
          ...item.collections.map((c) => c.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (tokens.every((t) => blob.includes(t))) {
          matchedItems.push({ ...item, matchReasons: matchReasons(item, text) });
        }
      }
      working = matchedItems;
    }
  }

  const sort: SortOption = text && filters.sort === "newest" ? "relevance" : filters.sort;
  return sortItems(working, sort);
}
