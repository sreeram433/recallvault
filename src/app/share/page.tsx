"use client";

import { SaveForm } from "@/components/capture/save-form";
import { extractUrlFromShareText } from "@/lib/urls";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

function ShareInner() {
  const params = useSearchParams();
  const url = useMemo(() => {
    return (
      params.get("url") ||
      extractUrlFromShareText(params.get("text") || "") ||
      params.get("text") ||
      ""
    );
  }, [params]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">Share sheet</p>
      <h1 className="display text-4xl">Save to RecallVault</h1>
      <p className="text-sm text-ink-muted">
        This page is the Web Share Target fallback. Instagram never sees RecallVault, and
        RecallVault never opens Instagram as you. Native Android share uses the companion app.
      </p>
      <div className="rounded-[28px] border border-line bg-paper-raised p-5">
        <SaveForm initialUrl={url} />
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<p>Reading shared link…</p>}>
      <ShareInner />
    </Suspense>
  );
}
