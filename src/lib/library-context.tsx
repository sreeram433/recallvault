"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addItemToCollection,
  addTagToItem,
  createCollectionRecord,
  createLocalUser,
  deleteAllUserData,
  deleteCollectionRecord,
  deleteItemRecord,
  deleteTagRecord,
  ensureTag,
  findDuplicate,
  hydrateItems,
  installSeed,
  loadSnapshot,
  mergeCollections,
  recordImportJob,
  removeItemFromCollection,
  removeTagFromItem,
  renameTagRecord,
  saveItemRecord,
  updateCollectionRecord,
  updateItemRecord,
  upsertReminder,
  writeAudit,
  writeSettings,
} from "./db";
import { isoNow } from "./dates";
import { searchItems, EMPTY_FILTERS } from "./search";
import { slugify } from "./slug";
import type {
  AppSettings,
  Collection,
  HydratedItem,
  ImportJob,
  LibrarySnapshot,
  Reminder,
  SavedItem,
  SearchFilters,
  Tag,
  UserProfile,
} from "./types";
import { extractUrlsFromExportPayload } from "./instagram-export";
import { canonicalizeUrl, detectSourceType, inferCreatorFromUrl } from "./urls";

interface SaveDraft {
  sourceUrl: string;
  title?: string;
  creatorName?: string;
  thumbnailUrl?: string;
  userNote?: string;
  captionText?: string;
  transcriptText?: string;
  collectionNames?: string[];
  tagNames?: string[];
  watchLater?: boolean;
  allowDuplicate?: boolean;
}

interface LibraryContextValue {
  ready: boolean;
  snapshot: LibrarySnapshot;
  user: UserProfile | null;
  settings: AppSettings | null;
  items: HydratedItem[];
  collections: Collection[];
  tags: Tag[];
  startLocal: (name: string, email?: string, withSeed?: boolean) => Promise<void>;
  saveItem: (draft: SaveDraft) => Promise<{ item: SavedItem; duplicate?: SavedItem }>;
  updateItem: (item: SavedItem) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  setCollectionsForItem: (itemId: string, collectionIds: string[]) => Promise<void>;
  setTagsForItem: (itemId: string, tagNames: string[]) => Promise<void>;
  toggleFavorite: (itemId: string) => Promise<void>;
  togglePin: (itemId: string) => Promise<void>;
  toggleArchive: (itemId: string) => Promise<void>;
  markUnavailable: (itemId: string) => Promise<void>;
  recordOpen: (itemId: string) => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<Collection>;
  renameCollection: (id: string, name: string) => Promise<void>;
  mergeCollection: (sourceId: string, targetId: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  renameTag: (id: string, name: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  setReminder: (itemId: string, remindAt: string, note?: string) => Promise<void>;
  completeReminder: (reminder: Reminder) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  importJsonFile: (file: File) => Promise<number>;
  importInstagramExport: (file: File) => Promise<number>;
  eraseEverything: () => Promise<void>;
  queryItems: (filters: SearchFilters) => HydratedItem[];
  findByCanonical: (url: string) => Promise<SavedItem | undefined>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const EMPTY_SNAPSHOT: LibrarySnapshot = {
  user: null,
  items: [],
  collections: [],
  tags: [],
  itemCollections: [],
  itemTags: [],
  reminders: [],
  importJobs: [],
  auditLogs: [],
  settings: null,
};

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(EMPTY_SNAPSHOT);

  const refresh = useCallback(async () => {
    const next = await loadSnapshot();
    setSnapshot(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadSnapshot().then((next) => {
      if (cancelled) return;
      setSnapshot(next);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => hydrateItems(snapshot), [snapshot]);

  const startLocal = useCallback(
    async (name: string, email?: string, withSeed = true) => {
      const created = await createLocalUser(name, email);
      if (withSeed) await installSeed(created.user.id);
      await refresh();
    },
    [refresh],
  );

  const saveItem = useCallback(
    async (draft: SaveDraft) => {
      if (!snapshot.user) throw new Error("Create a library first.");
      const canonical = canonicalizeUrl(draft.sourceUrl);
      if (!canonical) throw new Error("Enter a valid http(s) URL.");
      const duplicate = await findDuplicate(canonical);
      if (duplicate && !draft.allowDuplicate) {
        return { item: duplicate, duplicate };
      }
      const note = draft.userNote?.trim();
      const item = await saveItemRecord({
        userId: snapshot.user.id,
        sourceUrl: draft.sourceUrl,
        title: draft.title,
        creatorName: draft.creatorName || inferCreatorFromUrl(draft.sourceUrl),
        thumbnailUrl: draft.thumbnailUrl,
        userNote: note,
        captionText: draft.captionText,
        transcriptText: draft.transcriptText,
        sourceType: detectSourceType(draft.sourceUrl),
        needsReview: !note && !(draft.tagNames?.length || draft.collectionNames?.length),
      });
      const inbox = snapshot.collections.find((c) => c.systemKey === "inbox");
      if (inbox) await addItemToCollection(item.id, inbox.id);
      if (draft.watchLater) {
        const later = snapshot.collections.find((c) => c.systemKey === "watch_later");
        if (later) await addItemToCollection(item.id, later.id);
      }
      if (draft.collectionNames) {
        for (const name of draft.collectionNames) {
          const existing = snapshot.collections.find(
            (c) => c.slug === slugify(name) || c.name.toLowerCase() === name.toLowerCase(),
          );
          const collection = existing ?? (await createCollectionRecord(snapshot.user.id, name));
          await addItemToCollection(item.id, collection.id);
        }
      }
      if (draft.tagNames) {
        for (const name of draft.tagNames) {
          const tag = await ensureTag(snapshot.user.id, name);
          await addTagToItem(item.id, tag.id, "user");
        }
      }
      const needs = snapshot.collections.find((c) => c.systemKey === "needs_review");
      if (needs && (!note && !(draft.tagNames?.length || draft.collectionNames?.length))) {
        await addItemToCollection(item.id, needs.id);
      }
      await refresh();
      return { item, duplicate };
    },
    [refresh, snapshot.collections, snapshot.user],
  );

  const updateItem = useCallback(
    async (item: SavedItem) => {
      await updateItemRecord(item);
      await refresh();
    },
    [refresh],
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!snapshot.user) return;
      await deleteItemRecord(itemId, snapshot.user.id);
      await refresh();
    },
    [refresh, snapshot.user],
  );

  const setCollectionsForItem = useCallback(
    async (itemId: string, collectionIds: string[]) => {
      const current = snapshot.itemCollections.filter((j) => j.itemId === itemId);
      const next = new Set(collectionIds);
      for (const join of current) {
        if (!next.has(join.collectionId)) {
          await removeItemFromCollection(itemId, join.collectionId);
        }
      }
      const have = new Set(current.map((j) => j.collectionId));
      for (const id of collectionIds) {
        if (!have.has(id)) await addItemToCollection(itemId, id);
      }
      await refresh();
    },
    [refresh, snapshot.itemCollections],
  );

  const setTagsForItem = useCallback(
    async (itemId: string, tagNames: string[]) => {
      if (!snapshot.user) return;
      const current = snapshot.itemTags.filter((j) => j.itemId === itemId);
      const currentTags = current
        .map((j) => snapshot.tags.find((t) => t.id === j.tagId))
        .filter((t): t is Tag => Boolean(t));
      const wanted = new Set(tagNames.map((n) => slugify(n)));
      for (const tag of currentTags) {
        if (!wanted.has(tag.slug)) await removeTagFromItem(itemId, tag.id);
      }
      for (const name of tagNames) {
        const tag = await ensureTag(snapshot.user.id, name);
        if (!currentTags.some((t) => t.id === tag.id)) {
          await addTagToItem(itemId, tag.id, "user");
        }
      }
      await refresh();
    },
    [refresh, snapshot.itemTags, snapshot.tags, snapshot.user],
  );

  const mutateItem = useCallback(
    async (itemId: string, patch: Partial<SavedItem>) => {
      const item = snapshot.items.find((i) => i.id === itemId);
      if (!item) return;
      await updateItemRecord({ ...item, ...patch });
      await refresh();
    },
    [refresh, snapshot.items],
  );

  const toggleFavorite = useCallback(
    (itemId: string) => {
      const item = snapshot.items.find((i) => i.id === itemId);
      return mutateItem(itemId, { isFavorite: !item?.isFavorite });
    },
    [mutateItem, snapshot.items],
  );

  const togglePin = useCallback(
    (itemId: string) => {
      const item = snapshot.items.find((i) => i.id === itemId);
      return mutateItem(itemId, { isPinned: !item?.isPinned });
    },
    [mutateItem, snapshot.items],
  );

  const toggleArchive = useCallback(
    (itemId: string) => {
      const item = snapshot.items.find((i) => i.id === itemId);
      return mutateItem(itemId, { isArchived: !item?.isArchived });
    },
    [mutateItem, snapshot.items],
  );

  const markUnavailable = useCallback(
    (itemId: string) => mutateItem(itemId, { availabilityStatus: "reported_dead" }),
    [mutateItem],
  );

  const recordOpen = useCallback(
    async (itemId: string) => {
      const item = snapshot.items.find((i) => i.id === itemId);
      if (!item) return;
      await updateItemRecord({
        ...item,
        lastOpenedAt: isoNow(),
        openCount: item.openCount + 1,
      });
      if (snapshot.settings) {
        await writeSettings({ ...snapshot.settings, lastViewedItemId: itemId });
      }
      await refresh();
    },
    [refresh, snapshot.items, snapshot.settings],
  );

  const createCollection = useCallback(
    async (name: string, description?: string) => {
      if (!snapshot.user) throw new Error("No library");
      const collection = await createCollectionRecord(snapshot.user.id, name, description);
      await refresh();
      return collection;
    },
    [refresh, snapshot.user],
  );

  const renameCollection = useCallback(
    async (id: string, name: string) => {
      const collection = snapshot.collections.find((c) => c.id === id);
      if (!collection) return;
      await updateCollectionRecord({ ...collection, name, slug: slugify(name) });
      await refresh();
    },
    [refresh, snapshot.collections],
  );

  const mergeCollection = useCallback(
    async (sourceId: string, targetId: string) => {
      await mergeCollections(sourceId, targetId);
      await refresh();
    },
    [refresh],
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      await deleteCollectionRecord(id);
      await refresh();
    },
    [refresh],
  );

  const renameTag = useCallback(
    async (id: string, name: string) => {
      const tag = snapshot.tags.find((t) => t.id === id);
      if (!tag) return;
      await renameTagRecord(tag, name);
      await refresh();
    },
    [refresh, snapshot.tags],
  );

  const deleteTag = useCallback(
    async (id: string) => {
      await deleteTagRecord(id);
      await refresh();
    },
    [refresh],
  );

  const setReminder = useCallback(
    async (itemId: string, remindAt: string, note?: string) => {
      if (!snapshot.user) return;
      await upsertReminder({
        userId: snapshot.user.id,
        itemId,
        remindAt,
        note,
      });
      await refresh();
    },
    [refresh, snapshot.user],
  );

  const completeReminder = useCallback(
    async (reminder: Reminder) => {
      await upsertReminder({ ...reminder, completedAt: isoNow() });
      await refresh();
    },
    [refresh],
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      if (!snapshot.settings) return;
      const next = { ...snapshot.settings, ...patch };
      await writeSettings(next);
      if (patch.allowAiSuggestions !== undefined || patch.allowPreviewFetch !== undefined) {
        await writeAudit(
          snapshot.settings.userId,
          "consent_change",
          `Updated consent: preview=${next.allowPreviewFetch}, ai=${next.allowAiSuggestions}, notes=${next.allowAiIncludeNotes}, analytics=${next.allowAnalytics}`,
        );
      }
      await refresh();
    },
    [refresh, snapshot.settings],
  );

  const importJsonFile = useCallback(
    async (file: File) => {
      if (!snapshot.user) throw new Error("No library");
      const raw = JSON.parse(await file.text()) as {
        items?: Array<Record<string, string>>;
      };
      const rows = raw.items ?? [];
      let count = 0;
      for (const row of rows) {
        const url = row.url || row.sourceUrl || row.canonicalUrl;
        if (!url || !canonicalizeUrl(url)) continue;
        const existing = await findDuplicate(canonicalizeUrl(url)!);
        if (existing) continue;
        await saveItem({
          sourceUrl: url,
          title: row.title,
          creatorName: row.creator || row.creatorName,
          userNote: row.notes || row.userNote,
          captionText: row.caption,
          transcriptText: row.transcript,
          collectionNames: (row.collections || "")
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean),
          tagNames: (row.tags || "")
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean),
        });
        count += 1;
      }
      const job: ImportJob = {
        id: crypto.randomUUID(),
        userId: snapshot.user.id,
        kind: "json",
        status: "complete",
        fileName: file.name,
        itemCount: count,
        createdAt: isoNow(),
        completedAt: isoNow(),
      };
      await recordImportJob(job);
      await writeAudit(snapshot.user.id, "import", `Imported ${count} items from ${file.name}`);
      await refresh();
      return count;
    },
    [refresh, saveItem, snapshot.user],
  );

  const importInstagramExport = useCallback(
    async (file: File) => {
      if (!snapshot.user) throw new Error("No library");
      const raw = await file.text();
      const urls = extractUrlsFromExportPayload(raw);
      let count = 0;
      for (const sourceUrl of urls) {
        const existing = await findDuplicate(canonicalizeUrl(sourceUrl) ?? sourceUrl);
        if (existing) continue;
        await saveItem({ sourceUrl });
        count += 1;
      }
      await recordImportJob({
        id: crypto.randomUUID(),
        userId: snapshot.user.id,
        kind: "instagram_data_export",
        status: "complete",
        fileName: file.name,
        itemCount: count,
        createdAt: isoNow(),
        completedAt: isoNow(),
      });
      await writeAudit(
        snapshot.user.id,
        "import",
        `Imported ${count} Instagram URLs from user-provided export ${file.name}`,
      );
      await refresh();
      return count;
    },
    [refresh, saveItem, snapshot.user],
  );

  const eraseEverything = useCallback(async () => {
    if (snapshot.user) {
      await writeAudit(snapshot.user.id, "delete_account", "User requested permanent erase.");
    }
    await deleteAllUserData();
    setSnapshot(EMPTY_SNAPSHOT);
  }, [snapshot.user]);

  const queryItems = useCallback(
    (filters: SearchFilters) => searchItems(items, filters),
    [items],
  );

  const findByCanonical = useCallback(async (url: string) => {
    const canonical = canonicalizeUrl(url);
    if (!canonical) return undefined;
    return findDuplicate(canonical);
  }, []);

  const value: LibraryContextValue = {
    ready,
    snapshot,
    user: snapshot.user,
    settings: snapshot.settings,
    items,
    collections: snapshot.collections,
    tags: snapshot.tags,
    startLocal,
    saveItem,
    updateItem,
    deleteItem,
    setCollectionsForItem,
    setTagsForItem,
    toggleFavorite,
    togglePin,
    toggleArchive,
    markUnavailable,
    recordOpen,
    createCollection,
    renameCollection,
    mergeCollection,
    deleteCollection,
    renameTag,
    deleteTag,
    setReminder,
    completeReminder,
    updateSettings,
    importJsonFile,
    importInstagramExport,
    eraseEverything,
    queryItems,
    findByCanonical,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
  return ctx;
}

export { EMPTY_FILTERS };
