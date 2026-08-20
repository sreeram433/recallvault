"use client";

import { SaveForm } from "@/components/capture/save-form";
import { Badge } from "@/components/ui/badge";
import { parseSharedText, ShareValidationError } from "@/lib/share-target/validate";
import { extractUrlFromShareText } from "@/lib/urls";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

function CaptureInner() {
  const params = useSearchParams();
  const raw =
    params.get("url") ||
    extractUrlFromShareText(params.get("text") || "") ||
    params.get("text") ||
    "";

  const parsed = useMemo(() => {
    if (!raw) return null;
    try {
      return parseSharedText(raw);
    } catch (error) {
      return {
        error: error instanceof ShareValidationError ? error.message : "That link cannot be saved.",
      };
    }
  }, [raw]);

  const valid = parsed && "canonicalUrl" in parsed ? parsed : null;
  const error = parsed && "error" in parsed ? parsed.error : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">Share capture</p>
      <h1 className="display text-4xl">Save to RecallVault</h1>
      <p className="text-sm leading-6 text-ink-muted">
        This page is the browser fallback when the Android app is not installed. It accepts only
        the link you shared. It does not open Instagram, fetch the page, or read cookies.
      </p>
      {valid ? (
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{valid.contentType}</Badge>
          <Badge>{valid.sourcePlatform}</Badge>
          <Badge tone="line">user_shared</Badge>
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="rounded-[28px] border border-line bg-paper-raised p-5">
        <SaveForm initialUrl={valid?.canonicalUrl ?? raw} />
      </div>
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<p>Reading shared link…</p>}>
      <CaptureInner />
    </Suspense>
  );
}
