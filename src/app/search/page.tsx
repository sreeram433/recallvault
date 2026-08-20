"use client";

import { PaginatedGrid } from "@/components/items/paginated-grid";
import { FilterPanel, ResultsToolbar } from "@/components/search/toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { EMPTY_FILTERS, useLibrary } from "@/lib/library-context";
import type { SearchFilters, ViewMode } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function SearchInner() {
  const params = useSearchParams();
  const { items, queryItems, settings, updateSettings } = useLibrary();
  const [filters, setFilters] = useState<SearchFilters>({
    ...EMPTY_FILTERS,
    query: params.get("q") ?? settings?.lastQuery ?? "",
    sort: "relevance",
  });
  const view: ViewMode = settings?.viewMode ?? "grid";
  const results = useMemo(() => queryItems(filters), [filters, queryItems]);
  const creators = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.creatorName).filter((n): n is string => Boolean(n)))).sort(),
    [items],
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Universal search</p>
        <h1 className="display mt-1 text-4xl">Find the one you meant</h1>
      </header>
      <Input
        value={filters.query}
        onChange={(e) => {
          const query = e.target.value;
          setFilters((f) => ({ ...f, query }));
          void updateSettings({ lastQuery: query });
        }}
        placeholder='Try “beginner PyTorch last month” or “healthy paneer recipes”'
      />
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          "Python chatbot around January",
          "Hyderabad cafes with outdoor seating",
          "video editing hooks from a creator named editsbykira",
          "never opened hackathon",
        ].map((example) => (
          <button
            key={example}
            type="button"
            className="rounded-full border border-line px-3 py-1 text-ink-muted hover:bg-chip"
            onClick={() => setFilters((f) => ({ ...f, query: example }))}
          >
            {example}
          </button>
        ))}
      </div>
      <FilterPanel filters={filters} onChange={setFilters} creators={creators} />
      <ResultsToolbar
        count={results.length}
        sort={filters.sort}
        view={view}
        onSort={(sort) => setFilters((f) => ({ ...f, sort }))}
        onView={(next) => updateSettings({ viewMode: next })}
      />
      {results.length ? (
        <PaginatedGrid items={results} view={view} />
      ) : (
        <EmptyState
          title="Nothing matched"
          body="Search looks through notes, tags, collections, creators, captions, transcripts, dates, and URLs. Try fewer words or a creator name."
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-ink-muted">Loading search…</p>}>
      <SearchInner />
    </Suspense>
  );
}
