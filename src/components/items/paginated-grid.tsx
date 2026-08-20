"use client";

import { ItemGrid } from "@/components/items/item-card";
import { Button } from "@/components/ui/button";
import type { HydratedItem, ViewMode } from "@/lib/types";
import { useState } from "react";

const PAGE_SIZE = 12;

export function PaginatedGrid({
  items,
  view,
}: {
  items: HydratedItem[];
  view: ViewMode;
}) {
  const [page, setPage] = useState(1);
  const [signature, setSignature] = useState(`${view}:${items.length}:${items[0]?.id ?? ""}`);
  const nextSignature = `${view}:${items.length}:${items[0]?.id ?? ""}`;
  if (signature !== nextSignature) {
    setSignature(nextSignature);
    setPage(1);
  }
  const visible = items.slice(0, page * PAGE_SIZE);
  const remaining = items.length - visible.length;
  return (
    <div className="space-y-4">
      <ItemGrid items={visible} view={view} />
      {remaining > 0 ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)}>
            Show next {Math.min(PAGE_SIZE, remaining)} of {remaining}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
