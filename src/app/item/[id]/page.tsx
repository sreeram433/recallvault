"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { formatRelative, formatShortDate } from "@/lib/dates";
import { useLibrary } from "@/lib/library-context";
import { sourceTypeLabel } from "@/lib/urls";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const { items } = useLibrary();
  const item = items.find((i) => i.id === id);

  if (!item) {
    return (
      <div>
        <p>That item is not in this vault.</p>
        <Link href="/inbox" className="underline">
          Back to inbox
        </Link>
      </div>
    );
  }

  return <ItemEditor key={item.id} item={item} />;
}

function ItemEditor({ item }: { item: NonNullable<ReturnType<typeof useLibrary>["items"][number]> }) {
  const router = useRouter();
  const {
    collections,
    updateItem,
    deleteItem,
    setCollectionsForItem,
    setTagsForItem,
    markUnavailable,
    recordOpen,
    setReminder,
    toggleFavorite,
    togglePin,
    toggleArchive,
  } = useLibrary();
  const [note, setNote] = useState(item.userNote ?? "");
  const [title, setTitle] = useState(item.title ?? "");
  const [creator, setCreator] = useState(item.creatorName ?? "");
  const [caption, setCaption] = useState(item.captionText ?? "");
  const [transcript, setTranscript] = useState(item.transcriptText ?? "");
  const [tagDraft, setTagDraft] = useState(item.tags.map((t) => t.name).join(", "));
  const [remindAt, setRemindAt] = useState("");
  const [remindNote, setRemindNote] = useState("");
  const selected = useMemo(
    () => new Set(item.collections.map((c) => c.id)),
    [item],
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Saved item</p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{sourceTypeLabel(item.sourceType)}</Badge>
          <Badge>{item.availabilityStatus.replace("_", " ")}</Badge>
          {item.isFavorite ? <Badge tone="gold">Favorite</Badge> : null}
          {item.isPinned ? <Badge>Pinned</Badge> : null}
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Creator" />
        <p className="break-all font-mono text-xs text-ink-faint">{item.sourceUrl}</p>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why did you save this?"
        />
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Pasted caption"
        />
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Pasted transcript"
        />
        <Input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          placeholder="Tags, comma separated"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              await updateItem({
                ...item,
                title,
                creatorName: creator,
                userNote: note,
                captionText: caption,
                transcriptText: transcript,
                needsReview: !note && !tagDraft,
              });
              await setTagsForItem(
                item.id,
                tagDraft
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              );
            }}
          >
            Save changes
          </Button>
          <Button
            variant="secondary"
            disabled={item.availabilityStatus === "reported_dead"}
            onClick={() => {
              if (item.availabilityStatus === "reported_dead") return;
              void recordOpen(item.id);
              window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
            }}
          >
            {item.availabilityStatus === "reported_dead" ? "Original unavailable" : "Open original"}
          </Button>
        </div>
        <p className="text-xs text-ink-faint">
          Saved {formatShortDate(item.savedAt)} · Last opened {formatRelative(item.lastOpenedAt)} ·
          Opened {item.openCount} times
        </p>
      </div>
      <aside className="space-y-5">
        <section className="rounded-[24px] border border-line bg-paper-raised p-4">
          <h2 className="text-sm font-medium">Collections</h2>
          <div className="mt-3 space-y-2">
            {collections.map((collection) => (
              <label key={collection.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(collection.id)}
                  onChange={async (e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(collection.id);
                    else next.delete(collection.id);
                    await setCollectionsForItem(item.id, Array.from(next));
                  }}
                />
                {collection.name}
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-[24px] border border-line bg-paper-raised p-4 space-y-2">
          <h2 className="text-sm font-medium">Reminder</h2>
          <p className="text-xs text-ink-muted">You pick the date. We will not nag you for engagement.</p>
          <Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
          <Input
            value={remindNote}
            onChange={(e) => setRemindNote(e.target.value)}
            placeholder="Optional reminder note"
          />
          <Button
            size="sm"
            variant="gold"
            onClick={() => remindAt && setReminder(item.id, new Date(remindAt).toISOString(), remindNote)}
          >
            Set reminder
          </Button>
          {item.reminder ? (
            <p className="text-xs text-gold">
              Next: {new Date(item.reminder.remindAt).toLocaleString()}
            </p>
          ) : null}
        </section>
        <section className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => toggleFavorite(item.id)}>
            Favorite
          </Button>
          <Button size="sm" variant="secondary" onClick={() => togglePin(item.id)}>
            Pin
          </Button>
          <Button size="sm" variant="secondary" onClick={() => toggleArchive(item.id)}>
            Archive
          </Button>
          <Button size="sm" variant="gold" onClick={() => markUnavailable(item.id)}>
            Mark original unavailable
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={async () => {
              if (window.confirm("Delete this item and its joins?")) {
                await deleteItem(item.id);
                router.push("/inbox");
              }
            }}
          >
            Delete
          </Button>
        </section>
        {item.availabilityStatus === "reported_dead" ? (
          <p className="rounded-2xl bg-danger-soft p-3 text-sm text-danger">
            You marked the original unavailable. Your note and metadata stay here.
          </p>
        ) : (
          <p className="text-xs leading-5 text-ink-faint">
            The original post remains on Instagram or the source site and may disappear later.
          </p>
        )}
      </aside>
    </div>
  );
}
