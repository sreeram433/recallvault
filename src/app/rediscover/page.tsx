"use client";

import { ItemCard } from "@/components/items/item-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { daysAgo } from "@/lib/dates";
import { useLibrary } from "@/lib/library-context";
import { useMemo } from "react";

export default function RediscoverPage() {
  const { items, snapshot, completeReminder } = useLibrary();

  const digest = useMemo(() => {
    return [...items]
      .filter((item) => !item.isArchived && daysAgo(item.savedAt) >= 14)
      .sort((a, b) => {
        const aScore =
          (a.userNote ? 3 : 0) + (a.openCount === 0 ? 4 : 0) + Math.min(daysAgo(a.savedAt), 200) / 40;
        const bScore =
          (b.userNote ? 3 : 0) + (b.openCount === 0 ? 4 : 0) + Math.min(daysAgo(b.savedAt), 200) / 40;
        return bScore - aScore;
      })
      .slice(0, 5);
  }, [items]);

  const stale = items.filter((item) => !item.lastOpenedAt && !item.isArchived);
  const dead = items.filter((item) => item.availabilityStatus === "reported_dead");
  const reminders = snapshot.reminders.filter((r) => !r.completedAt);
  const watchLater = items.filter((item) =>
    item.collections.some((c) => c.systemKey === "watch_later"),
  );

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Rediscover</p>
        <h1 className="display mt-1 text-4xl">Use what you already saved</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          These are reminders you asked for, plus a weekly-style digest of five older items.
          Nothing here is designed to keep you scrolling.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="display text-2xl">This week’s five</h2>
        {digest.length ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {digest.map((item) => (
              <div key={item.id} className="space-y-2">
                {daysAgo(item.savedAt) >= 80 && item.userNote ? (
                  <p className="text-xs text-gold">
                    You saved this {daysAgo(item.savedAt)} days ago
                    {item.userNote ? ` — “${item.userNote.slice(0, 80)}”` : ""}. Review it?
                  </p>
                ) : null}
                <ItemCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing old enough yet" body="After two weeks, five older saves will appear here." />
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat title="Never opened" value={stale.length} body="Saved and then forgotten." />
        <Stat title="Watch Later" value={watchLater.length} body="A short queue, not a feed." />
        <Stat title="Reported unavailable" value={dead.length} body="Notes are still yours." />
      </section>

      <section>
        <h2 className="display text-2xl">Reminders you set</h2>
        <div className="mt-3 space-y-2">
          {reminders.length ? (
            reminders.map((reminder) => {
              const item = items.find((i) => i.id === reminder.itemId);
              return (
                <div
                  key={reminder.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper-raised px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{item?.title || item?.canonicalUrl}</p>
                    <p className="text-sm text-ink-muted">
                      {new Date(reminder.remindAt).toLocaleString()} {reminder.note ? `· ${reminder.note}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => completeReminder(reminder)}>
                    Done
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-ink-muted">No upcoming reminders. Set one from any item.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="display text-2xl">Stale saves</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {stale.slice(0, 8).map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value, body }: { title: string; value: number; body: string }) {
  return (
    <div className="rounded-[24px] border border-line bg-paper-raised p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">{title}</p>
      <p className="display mt-2 text-4xl">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
    </div>
  );
}
