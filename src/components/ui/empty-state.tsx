import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-dashed border-line bg-paper-raised/60 px-8 py-14 text-center",
        className,
      )}
    >
      <h3 className="display text-2xl text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
