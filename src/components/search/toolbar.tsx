"use client";

import { Button } from "@/components/ui/button";
import type { SearchFilters, SortOption, ViewMode } from "@/lib/types";
import { LayoutGrid, List } from "lucide-react";

export function ResultsToolbar({
  count,
  sort,
  view,
  onSort,
  onView,
}: {
  count: number;
  sort: SortOption;
  view: ViewMode;
  onSort: (sort: SortOption) => void;
  onView: (view: ViewMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-muted">{count} items</p>
      <div className="flex items-center gap-2">
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortOption)}
          className="h-9 rounded-full border border-line bg-paper-raised px-3 text-xs"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="recently_opened">Recently opened</option>
          <option value="most_opened">Most opened</option>
          <option value="az">A–Z</option>
          <option value="relevance">Relevance</option>
        </select>
        <Button
          type="button"
          size="icon"
          variant={view === "grid" ? "secondary" : "ghost"}
          aria-label="Grid view"
          onClick={() => onView("grid")}
        >
          <LayoutGrid className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={view === "list" ? "secondary" : "ghost"}
          aria-label="List view"
          onClick={() => onView("list")}
        >
          <List className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function FilterPanel({
  filters,
  onChange,
  creators,
}: {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  creators: string[];
}) {
  return (
    <div className="grid gap-3 rounded-[24px] border border-line bg-paper-raised p-4 md:grid-cols-4">
      <label className="text-xs text-ink-muted">
        Source
        <select
          className="mt-1 h-10 w-full rounded-2xl border border-line bg-paper px-3 text-sm"
          value={filters.sourceTypes[0] ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              sourceTypes: e.target.value ? [e.target.value as SearchFilters["sourceTypes"][number]] : [],
            })
          }
        >
          <option value="">Any</option>
          <option value="instagram_reel">Reel</option>
          <option value="instagram_post">Post</option>
          <option value="instagram_carousel">Carousel</option>
          <option value="instagram_story">Story</option>
          <option value="instagram_profile">Profile</option>
          <option value="web_link">Web</option>
        </select>
      </label>
      <label className="text-xs text-ink-muted">
        Creator
        <select
          className="mt-1 h-10 w-full rounded-2xl border border-line bg-paper px-3 text-sm"
          value={filters.creator}
          onChange={(e) => onChange({ ...filters, creator: e.target.value })}
        >
          <option value="">Any</option>
          {creators.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-ink-muted">
        Saved from
        <input
          type="date"
          className="mt-1 h-10 w-full rounded-2xl border border-line bg-paper px-3 text-sm"
          value={filters.savedFrom?.slice(0, 10) ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              savedFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined,
            })
          }
        />
      </label>
      <label className="flex items-end gap-4 pb-2 text-xs text-ink-muted">
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.favoritesOnly}
            onChange={(e) => onChange({ ...filters, favoritesOnly: e.target.checked })}
          />
          Favorites
        </span>
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.neverOpened}
            onChange={(e) => onChange({ ...filters, neverOpened: e.target.checked })}
          />
          Never opened
        </span>
      </label>
    </div>
  );
}
