"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME, APP_TAGLINE, PRIVACY_PILLARS } from "@/lib/constants";
import { useLibrary } from "@/lib/library-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const { user, ready, startLocal, settings } = useLibrary();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [seed, setSeed] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(settings?.lastRoute || "/inbox");
    }
  }, [ready, router, settings?.lastRoute, user]);

  if (!ready || user) {
    return <div className="grid min-h-[50vh] place-items-center text-ink-muted">Opening your vault…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">Privacy-first library</p>
      <h1 className="display mt-3 max-w-3xl text-5xl leading-[1.05] tracking-tight sm:text-7xl">
        {APP_NAME}
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-8 text-ink-muted">{APP_TAGLINE}</p>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-muted">
        Instagram’s Save button is a graveyard. ReelVault is the opposite: a calm, searchable
        index of links you chose to keep, plus the notes that make them findable.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          className="rounded-[28px] border border-line bg-paper-raised p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await startLocal(name || "You", email, seed);
            router.replace("/inbox");
          }}
        >
          <h2 className="display text-2xl">Start a local library</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Lives in this browser. No Instagram password. Optional cloud sync can be added later
            from Settings — it is never required.
          </p>
          <div className="mt-5 space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional, stored only on this device)"
            />
            <label className="flex items-start gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="mt-1"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                required
              />
              I understand ReelVault will not ask for my Instagram password and will not import my
              Instagram Saved tab automatically.
            </label>
            <label className="flex items-start gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                className="mt-1"
                checked={seed}
                onChange={(e) => setSeed(e.target.checked)}
              />
              Include a clearly fake sample library so I can try search. These are not my Instagram
              saves.
            </label>
          </div>
          <Button type="submit" className="mt-5 w-full" disabled={busy || !understood} size="lg">
            {busy ? "Creating…" : "Create my vault"}
          </Button>
          <p className="mt-3 text-xs leading-5 text-ink-faint">
            By continuing you agree we store only what you save. Read the{" "}
            <a className="underline" href="/privacy">
              privacy outline
            </a>
            .
          </p>
        </form>
        <aside className="rounded-[28px] border border-line bg-accent-soft/60 p-6">
          <h2 className="display text-2xl">Promises we keep</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6">
            {PRIVACY_PILLARS.map((item) => (
              <li key={item} className="border-b border-line/70 pb-3 last:border-0">
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
