"use client";

import { SaveForm } from "@/components/capture/save-form";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SaveInner() {
  const params = useSearchParams();
  const url = params.get("url") || params.get("text") || "";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">Fast capture</p>
      <h1 className="display text-4xl">Save this link</h1>
      <p className="text-sm leading-6 text-ink-muted">
        Confirm, add a note if you can, then you are done. Target: under three seconds for a
        one-tap save.
      </p>
      <div className="rounded-[28px] border border-line bg-paper-raised p-5">
        <SaveForm initialUrl={url} />
      </div>
    </div>
  );
}

export default function SavePage() {
  return (
    <Suspense fallback={<p>Preparing capture…</p>}>
      <SaveInner />
    </Suspense>
  );
}
