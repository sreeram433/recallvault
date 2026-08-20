import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-ring",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-sm",
        size === "icon" && "size-10 p-0",
        variant === "primary" && "bg-accent text-paper hover:bg-accent-hover dark:text-paper-sunken",
        variant === "secondary" && "bg-paper-raised text-ink border border-line hover:bg-chip",
        variant === "ghost" && "text-ink-muted hover:bg-chip hover:text-ink",
        variant === "danger" && "bg-danger-soft text-danger hover:bg-danger hover:text-paper",
        variant === "gold" && "bg-gold-soft text-ink hover:bg-gold hover:text-paper-sunken",
        className,
      )}
      {...props}
    />
  );
}
