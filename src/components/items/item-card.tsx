"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative, formatShortDate } from "@/lib/dates";
import { useLibrary } from "@/lib/library-context";
import type { HydratedItem } from "@/lib/types";
import { sourceTypeLabel } from "@/lib/urls";
import { Archive, ExternalLink, Pin, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function ItemCard({ item }: { item: HydratedItem }) {
  const { toggleFavorite, togglePin, recordOpen } = useLibrary();
  const heading = item.title || item.creatorName || item.canonicalUrl;

  return (
    <article className="card-hover flex flex-col rounded-[24px] border border-line bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <Thumbnail item={item} />
        <div className="flex gap-1">
          <IconToggle
            active={item.isPinned}
            label="Pin"
            onClick={() => togglePin(item.id)}
          >
            <Pin className="size-3.5" />
          </IconToggle>
          <IconToggle
            active={item.isFavorite}
            label="Favorite"
            onClick={() => toggleFavorite(item.id)}
          >
            <Star className="size-3.5" />
          </IconToggle>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge tone="accent">{sourceTypeLabel(item.sourceType)}</Badge>
        {item.availabilityStatus === "reported_dead" ? (
          <Badge tone="danger">Original unavailable</Badge>
        ) : null}
        {item.isArchived ? <Badge>Archived</Badge> : null}
        {item.needsReview ? <Badge tone="gold">Needs review</Badge> : null}
      </div>
      <h3 className="mt-3 font-medium leading-snug text-ink">
        <Link href={`/item/${item.id}`} className="hover:text-accent">
          {heading}
        </Link>
      </h3>
      {item.creatorName ? (
        <p className="mt-1 text-sm text-ink-muted">@{item.creatorName}</p>
      ) : null}
      {item.userNote ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/90">{item.userNote}</p>
      ) : (
        <p className="mt-3 text-sm italic text-ink-faint">No note yet — future you will thank you.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.collections
          .filter((c) => !c.isSystem)
          .slice(0, 3)
          .map((c) => (
            <Badge key={c.id} tone="line">
              {c.name}
            </Badge>
          ))}
        {item.tags.slice(0, 3).map((t) => (
          <Badge key={t.id}>{t.name}</Badge>
        ))}
      </div>
      {item.matchReasons?.length ? (
        <ul className="mt-3 space-y-1 text-xs text-accent">
          {item.matchReasons.map((reason) => (
            <li key={reason}>Match · {reason}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-ink-faint">
        <span>Saved {formatShortDate(item.savedAt)}</span>
        <span>Opened {formatRelative(item.lastOpenedAt)}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/item/${item.id}`}
          className="inline-flex h-8 flex-1 items-center justify-center rounded-full border border-line bg-paper-raised px-3 text-xs font-medium hover:bg-chip"
        >
          Open in vault
        </Link>
        {item.availabilityStatus === "reported_dead" ? (
          <Button size="sm" className="flex-1" variant="secondary" disabled>
            Original unavailable
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => {
              void recordOpen(item.id);
              window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="size-3.5" />
            Original
          </Button>
        )}
      </div>
    </article>
  );
}

export function ItemRow({ item }: { item: HydratedItem }) {
  const { recordOpen, toggleFavorite } = useLibrary();
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-line bg-paper-raised px-3 py-3">
      <Thumbnail item={item} compact />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/item/${item.id}`} className="truncate font-medium hover:text-accent">
            {item.title || item.creatorName || item.canonicalUrl}
          </Link>
          <Badge tone="accent">{sourceTypeLabel(item.sourceType)}</Badge>
          {item.availabilityStatus === "reported_dead" ? (
            <Badge tone="danger">Dead link</Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-sm text-ink-muted">
          {item.userNote || item.creatorName || item.sourceUrl}
        </p>
        {item.matchReasons?.[0] ? (
          <p className="mt-1 text-xs text-accent">{item.matchReasons[0]}</p>
        ) : null}
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <span className="text-xs text-ink-faint">{formatShortDate(item.savedAt)}</span>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Favorite"
          onClick={() => toggleFavorite(item.id)}
        >
          <Star className={item.isFavorite ? "size-4 fill-gold text-gold" : "size-4"} />
        </Button>
        <Button
          size="sm"
          disabled={item.availabilityStatus === "reported_dead"}
          onClick={() => {
            if (item.availabilityStatus === "reported_dead") return;
            void recordOpen(item.id);
            window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
          }}
        >
          {item.availabilityStatus === "reported_dead" ? "Unavailable" : "Original"}
        </Button>
      </div>
    </div>
  );
}

function Thumbnail({ item, compact }: { item: HydratedItem; compact?: boolean }) {
  const letter = (item.creatorName || item.title || "R").slice(0, 1).toUpperCase();
  return (
    <div
      className={
        compact
          ? "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-accent"
          : "flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-accent-soft text-lg text-accent"
      }
    >
      {item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="display">{letter}</span>
      )}
    </div>
  );
}

function IconToggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full p-2 ${active ? "bg-gold-soft text-gold" : "text-ink-faint hover:bg-chip"}`}
    >
      {children}
    </button>
  );
}

export function ItemGrid({
  items,
  view,
}: {
  items: HydratedItem[];
  view: "grid" | "list";
}) {
  if (view === "list") {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export function ArchiveHint() {
  return (
    <p className="flex items-center gap-2 text-xs text-ink-faint">
      <Archive className="size-3.5" /> Archived items stay searchable.
    </p>
  );
}
