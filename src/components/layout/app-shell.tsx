"use client";

import { SaveForm } from "@/components/capture/save-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";
import { useLibrary } from "@/lib/library-context";
import { NAV_ITEMS } from "@/lib/constants";
import {
  BookmarkPlus,
  Inbox,
  LayoutGrid,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ICONS = {
  "/inbox": Inbox,
  "/search": Search,
  "/collections": LayoutGrid,
  "/rediscover": Sparkles,
  "/settings": Settings,
} as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, settings, updateSettings, items } = useLibrary();
  const [query, setQuery] = useState(settings?.lastQuery ?? "");
  const [saveOpen, setSaveOpen] = useState(false);
  const dark =
    settings?.theme === "dark" ||
    (settings?.theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = settings?.theme === "dark" || (settings?.theme !== "light" && prefersDark);
    root.classList.toggle("dark", Boolean(isDark));
  }, [settings?.theme]);

  useEffect(() => {
    if (!ready || !user || !settings) return;
    if (pathname.startsWith("/item")) return;
    if (settings.lastRoute !== pathname) {
      void updateSettings({ lastRoute: pathname });
    }
  }, [pathname, ready, settings, updateSettings, user]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
        document.getElementById("global-search")?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSaveOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-ink-muted">Opening your vault…</div>
    );
  }

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen grain">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-line px-5 py-6 lg:flex lg:flex-col">
          <Link href="/inbox" className="display text-3xl tracking-tight">
            {APP_NAME}
          </Link>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            {items.length} kept · yours alone
          </p>
          <nav className="mt-8 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.href];
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 ${
                    active ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-chip hover:text-ink"
                  }`}
                >
                  <Icon className="mt-0.5 size-4" />
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-[11px] opacity-80">{item.hint}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-3 pt-8">
            <Button className="w-full" onClick={() => setSaveOpen(true)}>
              <BookmarkPlus className="size-4" />
              Save a link
            </Button>
            <p className="text-[11px] leading-4 text-ink-faint">
              ⌘K search · ⌘S save. We do not log into Instagram for you.
            </p>
          </div>
        </aside>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-line bg-paper/85 px-4 py-3 backdrop-blur-md lg:px-8">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void updateSettings({ lastQuery: query });
                router.push(`/search?q=${encodeURIComponent(query)}`);
              }}
            >
              <Search className="size-4 text-ink-faint" />
              <Input
                id="global-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes, tags, creators, dates… try “Hyderabad cafes”"
                className="border-0 bg-transparent shadow-none"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                onClick={() =>
                  updateSettings({ theme: dark ? "light" : "dark" })
                }
              >
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </form>
          </header>
          <main className="flex-1 px-4 py-6 pb-28 lg:px-8 lg:pb-10">{children}</main>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 px-1 py-2 backdrop-blur lg:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.href];
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 text-[10px] ${
                active ? "text-accent" : "text-ink-muted"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {saveOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-end bg-ink/30 p-3 sm:place-items-center">
          <div className="w-full max-w-2xl rounded-[28px] border border-line bg-paper p-5 shadow-[var(--shadow)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="display text-2xl">Save to your vault</h2>
              <Button variant="ghost" onClick={() => setSaveOpen(false)}>
                Close
              </Button>
            </div>
            <SaveForm onSaved={() => setSaveOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
