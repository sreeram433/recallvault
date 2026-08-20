import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-line bg-paper-raised px-3.5 text-sm text-ink placeholder:text-ink-faint focus-ring",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-2xl border border-line bg-paper-raised px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus-ring",
        className,
      )}
      {...props}
    />
  );
}
