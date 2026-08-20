"use client";

import { Button } from "@/components/ui/button";
import { downloadText, toCsv, toJson, toMarkdown, toExportRecord } from "@/lib/export";
import { useLibrary } from "@/lib/library-context";
import { writeAudit } from "@/lib/db";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    items,
    eraseEverything,
    importJsonFile,
    importInstagramExport,
    snapshot,
    user,
  } = useLibrary();
  const router = useRouter();
  const [importMsg, setImportMsg] = useState("");

  if (!settings || !user) return null;
  const userId = user.id;
  const profile = user;

  function records() {
    return items.map(toExportRecord);
  }

  async function exportAll(kind: "json" | "csv" | "md") {
    const recs = records();
    if (kind === "json") downloadText("reelvault-export.json", toJson(recs), "application/json");
    if (kind === "csv") downloadText("reelvault-export.csv", toCsv(recs), "text/csv");
    if (kind === "md") downloadText("reelvault-export.md", toMarkdown(recs), "text/markdown");
    await writeAudit(userId, "export", `Exported ${recs.length} items as ${kind}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Settings</p>
        <h1 className="display mt-1 text-4xl">Ownership and consent</h1>
      </header>

      <section className="rounded-[24px] border border-line bg-paper-raised p-5 space-y-3">
        <h2 className="display text-2xl">What ReelVault is not</h2>
        <p className="text-sm leading-6 text-ink-muted">
          ReelVault is not Instagram, does not log into Instagram, and does not import your
          Instagram Saved tab automatically. Original media stays on Instagram and may become
          unavailable if a creator deletes, archives, or restricts it. We do not copy or
          redistribute Instagram media by default.
        </p>
      </section>

      <section className="space-y-4 rounded-[24px] border border-line bg-paper-raised p-5">
        <h2 className="display text-2xl">Consent</h2>
        <Toggle
          label="Allow public preview fetch"
          hint="Only after you click Fetch. Reads public Open Graph tags. Never logs in."
          checked={settings.allowPreviewFetch}
          onChange={(allowPreviewFetch) => updateSettings({ allowPreviewFetch })}
        />
        <Toggle
          label="Allow optional AI tag suggestions"
          hint="Uses SpaceXAI (xAI) on the server. Off until you opt in. Suggestions are never auto-applied."
          checked={settings.allowAiSuggestions}
          onChange={(allowAiSuggestions) =>
            updateSettings({
              allowAiSuggestions,
              allowAiIncludeNotes: allowAiSuggestions ? settings.allowAiIncludeNotes : false,
            })
          }
        />
        <Toggle
          label="Include my notes in AI requests"
          hint="Leave this off unless you want the model to read a note you just typed."
          checked={settings.allowAiIncludeNotes}
          onChange={(allowAiIncludeNotes) => updateSettings({ allowAiIncludeNotes })}
        />
        <Toggle
          label="Opt-in product analytics"
          hint="This starter does not send analytics anywhere. The toggle exists so the product never defaults to tracking."
          checked={settings.allowAnalytics}
          onChange={(allowAnalytics) => updateSettings({ allowAnalytics })}
        />
      </section>

      <PairAndroid displayName={profile.displayName} />

      <section className="space-y-3 rounded-[24px] border border-line bg-paper-raised p-5">
        <h2 className="display text-2xl">Backup and export</h2>
        <p className="text-sm text-ink-muted">
          Export is your metadata only: titles, URLs, notes, tags, collections, timestamps, status.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void exportAll("json")}>Export JSON</Button>
          <Button variant="secondary" onClick={() => void exportAll("csv")}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => void exportAll("md")}>
            Export Markdown
          </Button>
        </div>
        <label className="mt-4 block text-sm">
          Import a previous ReelVault JSON export
          <input
            type="file"
            accept="application/json"
            className="mt-2 block text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const count = await importJsonFile(file);
              setImportMsg(`Imported ${count} new items. Duplicates were skipped.`);
            }}
          />
        </label>
        <label className="mt-4 block text-sm">
          Import a user-provided Instagram data-export file
          <span className="mt-1 block text-xs text-ink-muted">
            We only extract URLs you already downloaded from Instagram. This is not a live Saved-tab
            sync and never logs in as you.
          </span>
          <input
            type="file"
            accept="application/json,.json"
            className="mt-2 block text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const count = await importInstagramExport(file);
              setImportMsg(`Imported ${count} Instagram URLs from your export file.`);
            }}
          />
        </label>
        {importMsg ? <p className="text-sm text-accent">{importMsg}</p> : null}
      </section>

      <section className="space-y-3 rounded-[24px] border border-line bg-paper-raised p-5">
        <h2 className="display text-2xl">Library</h2>
        <p className="text-sm text-ink-muted">
          Local profile: {profile.displayName}
          {profile.email ? ` · ${profile.email}` : ""}. Mode: {profile.mode}. Cloud sync is designed, not
          required — see <code>supabase/migrations</code>.
        </p>
        <p className="text-sm text-ink-muted">{items.length} items · {snapshot.auditLogs.length} visible audit events.</p>
        <ul className="max-h-40 space-y-1 overflow-auto text-xs text-ink-faint">
          {snapshot.auditLogs
            .slice()
            .reverse()
            .slice(0, 12)
            .map((log) => (
              <li key={log.id}>
                {new Date(log.createdAt).toLocaleString()} — {log.action}: {log.detail}
              </li>
            ))}
        </ul>
      </section>

      <section className="rounded-[24px] border border-danger/30 bg-danger-soft p-5">
        <h2 className="display text-2xl text-danger">Delete this library</h2>
        <p className="mt-2 text-sm leading-6">
          Permanently erases every item, note, tag, reminder, and audit log stored in this browser.
          This cannot be undone. Export first if you want a copy.
        </p>
        <Button
          className="mt-4"
          variant="danger"
          onClick={async () => {
            const typed = window.prompt('Type DELETE to permanently erase this vault.');
            if (typed === "DELETE") {
              await eraseEverything();
              router.replace("/");
            }
          }}
        >
          Delete account and erase data
        </Button>
      </section>
    </div>
  );
}

function PairAndroid({ displayName }: { displayName: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="space-y-3 rounded-[24px] border border-line bg-paper-raised p-5">
      <h2 className="display text-2xl">Pair Android · Save to RecallVault</h2>
      <p className="text-sm leading-6 text-ink-muted">
        The Android app appears in the system share sheet as <strong>Save to RecallVault</strong>.
        It only receives the URL you share. Pairing issues a session token stored in Android
        Keystore-backed storage. Without pairing, shares stay in an encrypted on-device queue.
      </p>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/v1/auth/pairing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ displayName }),
            });
            const data = (await res.json()) as { pairingCode?: string; error?: string };
            if (!res.ok || !data.pairingCode) throw new Error(data.error || "Could not start pairing");
            setCode(data.pairingCode);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Pairing failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Creating code…" : "Create pairing code"}
      </Button>
      {code ? (
        <p className="font-mono text-3xl tracking-[0.3em] text-accent">{code}</p>
      ) : null}
      <p className="text-xs text-ink-faint">
        Enter this code in the Android app within 10 minutes. Never share it in screenshots of
        saved Reels.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border-b border-line pb-3 last:border-0">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-ink-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4"
      />
    </label>
  );
}
