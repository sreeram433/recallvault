"use client";

import { SaveForm } from "@/components/capture/save-form";
import { PaginatedGrid } from "@/components/items/paginated-grid";
import { ResultsToolbar } from "@/components/search/toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { useLibrary } from "@/lib/library-context";
import type { SortOption, ViewMode } from "@/lib/types";
import { useMemo, useState } from "react";

export default function InboxPage() {
  const { items, settings, updateSettings } = useLibrary();
  const [sort, setSort] = useState<SortOption>("newest");
  const view: ViewMode = settings?.viewMode ?? "grid";
  const inbox = useMemo(() => {
    const list = items.filter(
      (item) =>
        !item.isArchived &&
        item.collections.some((c) => c.systemKey === "inbox"),
    );
    return [...list].sort((a, b) =>
      sort === "oldest" ? a.savedAt.localeCompare(b.savedAt) : b.savedAt.localeCompare(a.savedAt),
    );
  }, [items, sort]);
  const unsorted = inbox.filter(
    (item) => item.collections.filter((c) => !c.isSystem).length === 0,
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Capture inbox</p>
        <h1 className="display mt-1 text-4xl">What you just decided to keep</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          Every new link lands here. Add a note if you can — that is how you beat the graveyard.
          Save stays on this device unless you later turn on sync.
        </p>
      </header>
      <section className="rounded-[28px] border border-line bg-paper-raised p-5">
        <SaveForm compact />
      </section>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-chip px-3 py-1">{inbox.length} in inbox</span>
        <span className="rounded-full bg-gold-soft px-3 py-1 text-gold">
          {unsorted.length} still unsorted
        </span>
      </div>
      <ResultsToolbar
        count={inbox.length}
        sort={sort}
        view={view}
        onSort={setSort}
        onView={(next) => updateSettings({ viewMode: next })}
      />
      {inbox.length ? (
        <PaginatedGrid items={inbox} view={view} />
      ) : (
        <EmptyState
          title="Inbox is clear"
          body="Paste a public Instagram or web URL above, share a link to this PWA, or use the browser extension."
        />
      )}
    </div>
  );
}
