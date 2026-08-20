"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useLibrary } from "@/lib/library-context";
import { localSuggest } from "@/lib/suggest";
import type { PreviewMetadata } from "@/lib/types";
import {
  canonicalizeUrl,
  detectSourceType,
  inferCreatorFromUrl,
  sourceTypeLabel,
} from "@/lib/urls";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function SaveForm({
  initialUrl = "",
  compact = false,
  onSaved,
}: {
  initialUrl?: string;
  compact?: boolean;
  onSaved?: (id: string) => void;
}) {
  const { saveItem, findByCanonical, settings, collections } = useLibrary();
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [urlSeed, setUrlSeed] = useState(initialUrl);
  if (initialUrl !== urlSeed) {
    setUrlSeed(initialUrl);
    setUrl(initialUrl);
  }
  const [note, setNote] = useState("");
  const [caption, setCaption] = useState("");
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [watchLater, setWatchLater] = useState(false);
  const [includeNote, setIncludeNote] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "duplicate" | "error">("idle");
  const [message, setMessage] = useState("");
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewMetadata | null>(null);

  const sourceType = detectSourceType(url);
  const inferredCreator = inferCreatorFromUrl(url);
  const suggestions = useMemo(
    () =>
      localSuggest({
        title,
        creatorName: creator || inferredCreator,
        sourceType,
        captionText: caption,
        transcriptText: transcript,
        userNote: note,
        includeNote: true,
      }),
    [caption, creator, inferredCreator, note, sourceType, title, transcript],
  );

  async function checkDuplicate(value: string) {
    const found = await findByCanonical(value);
    if (found) {
      setStatus("duplicate");
      setDuplicateId(found.id);
      setMessage("This URL is already in your vault.");
    } else if (status === "duplicate") {
      setStatus("idle");
      setDuplicateId(null);
      setMessage("");
    }
  }

  async function fetchPreview() {
    if (!settings?.allowPreviewFetch) {
      setMessage("Preview fetch is off. You can still save the URL and type a title.");
      return;
    }
    const canonical = canonicalizeUrl(url);
    if (!canonical) return;
    setMessage("Fetching public preview…");
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: canonical }),
      });
      const data = (await res.json()) as PreviewMetadata & { error?: string };
      if (!res.ok) throw new Error(data.error || "Preview unavailable");
      setPreview(data);
      if (data.title) setTitle(data.title);
      if (data.creatorName) setCreator(data.creatorName);
      setMessage("Public metadata attached. Media itself was not downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preview failed");
    }
  }

  async function requestAi() {
    if (!settings?.allowAiSuggestions) {
      setSelectedTags(Array.from(new Set([...selectedTags, ...suggestions.tags])));
      setSelectedCollections(Array.from(new Set([...selectedCollections, ...suggestions.collections])));
      setMessage("Used on-device suggestions. Cloud AI is off.");
      return;
    }
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          creatorName: creator || inferredCreator,
          sourceType,
          captionText: caption,
          transcriptText: transcript,
          userNote: includeNote ? note : undefined,
          includeNote,
          existingCollections: collections.map((c) => c.name),
        }),
      });
      const data = (await res.json()) as { tags?: string[]; collections?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error || "AI unavailable");
      setSelectedTags(Array.from(new Set([...selectedTags, ...(data.tags ?? [])])));
      setSelectedCollections(Array.from(new Set([...selectedCollections, ...(data.collections ?? [])])));
      setMessage("AI suggestions added. Nothing was saved until you confirm.");
    } catch (error) {
      setSelectedTags(Array.from(new Set([...selectedTags, ...suggestions.tags])));
      setSelectedCollections(Array.from(new Set([...selectedCollections, ...suggestions.collections])));
      setMessage(
        `${error instanceof Error ? error.message : "AI failed"}. Fell back to on-device suggestions.`,
      );
    }
  }

  async function onSubmit(allowDuplicate = false) {
    setStatus("saving");
    try {
      const result = await saveItem({
        sourceUrl: url,
        title: title || preview?.title,
        creatorName: creator || inferredCreator || preview?.creatorName,
        thumbnailUrl: preview?.thumbnailUrl,
        userNote: note,
        captionText: caption,
        transcriptText: transcript,
        collectionNames: selectedCollections,
        tagNames: selectedTags,
        watchLater,
        allowDuplicate,
      });
      if (result.duplicate && !allowDuplicate) {
        setStatus("duplicate");
        setDuplicateId(result.duplicate.id);
        setMessage("Already saved. Open the existing item or save a second copy.");
        return;
      }
      setStatus("saved");
      setMessage("Saved to your inbox.");
      onSaved?.(result.item.id);
      if (!compact) router.push(`/item/${result.item.id}`);
      setUrl("");
      setNote("");
      setCaption("");
      setTranscript("");
      setTitle("");
      setSelectedTags([]);
      setSelectedCollections([]);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save");
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(false);
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            void checkDuplicate(e.target.value);
          }}
          placeholder="Paste an Instagram or web URL"
          inputMode="url"
          autoComplete="off"
          required
        />
        <Button type="submit" disabled={status === "saving"} className="sm:w-40">
          {status === "saving" ? "Saving…" : "Save"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Badge tone="accent">{sourceTypeLabel(sourceType)}</Badge>
        <span>Original stays on its site. We store the link and your notes.</span>
      </div>
      {!compact ? (
        <>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='Optional note — “Use this for my ML project.”'
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
            />
            <Input
              value={creator || inferredCreator || ""}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="Creator or account"
            />
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Paste caption text if you want it searchable"
            />
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste spoken words / transcript if you have them"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void fetchPreview()}>
              Fetch public preview
            </Button>
            <Button type="button" variant="gold" size="sm" onClick={() => void requestAi()}>
              Suggest tags
            </Button>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={watchLater}
                onChange={(e) => setWatchLater(e.target.checked)}
              />
              Add to Watch Later
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={includeNote}
                onChange={(e) => setIncludeNote(e.target.checked)}
              />
              Include my note if I use cloud AI
            </label>
          </div>
          <ChipEditor
            label="Tags"
            values={selectedTags}
            suggestions={suggestions.tags}
            onChange={setSelectedTags}
          />
          <ChipEditor
            label="Collections"
            values={selectedCollections}
            suggestions={suggestions.collections}
            onChange={setSelectedCollections}
          />
        </>
      ) : (
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note so you can find this later"
        />
      )}
      {message ? (
        <p className={`text-sm ${status === "error" || status === "duplicate" ? "text-danger" : "text-ink-muted"}`}>
          {message}{" "}
          {duplicateId ? (
            <a className="underline" href={`/item/${duplicateId}`}>
              View existing
            </a>
          ) : null}
        </p>
      ) : null}
      {status === "duplicate" ? (
        <p className="text-xs text-ink-muted">
          We did not create a second row. Open the existing item and add a note instead.
        </p>
      ) : null}
    </form>
  );
}

function ChipEditor({
  label,
  values,
  suggestions,
  onChange,
}: {
  label: string;
  values: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  function add(value: string) {
    const next = value.trim();
    if (!next) return;
    if (!values.some((v) => v.toLowerCase() === next.toLowerCase())) {
      onChange([...values, next]);
    }
    setDraft("");
  }
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-[0.16em] text-ink-faint">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <button
            type="button"
            key={value}
            className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent"
            onClick={() => onChange(values.filter((v) => v !== value))}
          >
            {value} ×
          </button>
        ))}
        {suggestions
          .filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()))
          .map((value) => (
            <button
              type="button"
              key={value}
              className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-ink-muted"
              onClick={() => add(value)}
            >
              + {value}
            </button>
          ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={`Add ${label.toLowerCase()}`}
          className="h-7 min-w-36 bg-transparent text-xs outline-none"
        />
      </div>
    </div>
  );
}
