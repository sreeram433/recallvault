"use client";

import { LibraryProvider } from "@/lib/library-context";
import { AppShell } from "./layout/app-shell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LibraryProvider>
      <AppShell>{children}</AppShell>
    </LibraryProvider>
  );
}
