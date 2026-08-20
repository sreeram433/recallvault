"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useLibrary } from "@/lib/library-context";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function CollectionsPage() {
  const { collections, items, createCollection, mergeCollection, deleteCollection, renameCollection } =
    useLibrary();
  const [name, setName] = useState("");
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      for (const collection of item.collections) {
        map.set(collection.id, (map.get(collection.id) ?? 0) + 1);
      }
    }
    return map;
  }, [items]);

  const userCollections = collections.filter((c) => !c.isSystem);
  const system = collections.filter((c) => c.isSystem);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Collections</p>
        <h1 className="display mt-1 text-4xl">Topics, not folders</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          An item can live in several collections. We never silently move or delete anything.
        </p>
      </header>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await createCollection(name.trim());
          setName("");
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New collection name"
        />
        <Button type="submit">Create</Button>
      </form>

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-faint">System views</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {system.map((collection) => (
            <CollectionTile
              key={collection.id}
              name={collection.name}
              description={collection.description}
              count={counts.get(collection.id) ?? 0}
              href={`/collections/${collection.id}`}
              color={collection.color}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-faint">Your collections</h2>
        {userCollections.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {userCollections.map((collection) => (
              <div key={collection.id} className="rounded-[24px] border border-line bg-paper-raised p-4">
                <CollectionTile
                  name={collection.name}
                  description={collection.description}
                  count={counts.get(collection.id) ?? 0}
                  href={`/collections/${collection.id}`}
                  color={collection.color}
                />
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const next = window.prompt("Rename collection", collection.name);
                      if (next) await renameCollection(collection.id, next);
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (window.confirm("Delete this collection? Items stay in your library.")) {
                        await deleteCollection(collection.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No custom collections" body="Create one above, or accept a suggestion when you save." />
        )}
      </section>

      <section className="rounded-[24px] border border-line p-4">
        <h2 className="display text-xl">Merge collections</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Moves memberships into the target, then removes the source. System collections stay.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            className="h-10 flex-1 rounded-2xl border border-line bg-paper-raised px-3 text-sm"
            value={mergeSource}
            onChange={(e) => setMergeSource(e.target.value)}
          >
            <option value="">Source</option>
            {userCollections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 flex-1 rounded-2xl border border-line bg-paper-raised px-3 text-sm"
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
          >
            <option value="">Target</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              if (mergeSource && mergeTarget) {
                await mergeCollection(mergeSource, mergeTarget);
                setMergeSource("");
                setMergeTarget("");
              }
            }}
          >
            Merge
          </Button>
        </div>
      </section>
    </div>
  );
}

function CollectionTile({
  name,
  description,
  count,
  href,
  color,
}: {
  name: string;
  description?: string;
  count: number;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} className="block">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs text-paper"
          style={{ background: color }}
        >
          {count}
        </span>
      </div>
    </Link>
  );
}
