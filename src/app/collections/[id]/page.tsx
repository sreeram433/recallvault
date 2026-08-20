"use client";

import { PaginatedGrid } from "@/components/items/paginated-grid";
import { ResultsToolbar } from "@/components/search/toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { useLibrary } from "@/lib/library-context";
import type { SortOption } from "@/lib/types";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { collections, items, settings, updateSettings } = useLibrary();
  const [sort, setSort] = useState<SortOption>("newest");
  const collection = collections.find((c) => c.id === id);
  const list = useMemo(() => {
    const filtered = items.filter((item) => item.collections.some((c) => c.id === id));
    return [...filtered].sort((a, b) =>
      sort === "oldest" ? a.savedAt.localeCompare(b.savedAt) : b.savedAt.localeCompare(a.savedAt),
    );
  }, [id, items, sort]);

  if (!collection) {
    return <EmptyState title="Collection missing" body="It may have been merged or deleted." />;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">
          {collection.isSystem ? "System view" : "Collection"}
        </p>
        <h1 className="display mt-1 text-4xl">{collection.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">{collection.description}</p>
      </header>
      <ResultsToolbar
        count={list.length}
        sort={sort}
        view={settings?.viewMode ?? "grid"}
        onSort={setSort}
        onView={(view) => updateSettings({ viewMode: view })}
      />
      {list.length ? (
        <PaginatedGrid items={list} view={settings?.viewMode ?? "grid"} />
      ) : (
        <EmptyState title="Nothing here yet" body="Save a link and assign this collection, or wait for inbox items." />
      )}
    </div>
  );
}
