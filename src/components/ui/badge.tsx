import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "chip",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "chip" | "accent" | "gold" | "danger" | "line";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "chip" && "bg-chip text-ink-muted",
        tone === "accent" && "bg-accent-soft text-accent",
        tone === "gold" && "bg-gold-soft text-gold",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "line" && "border border-line text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
