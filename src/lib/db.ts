import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import { DEFAULT_COLLECTIONS } from "./constants";
import { isoNow } from "./dates";
import { SEED_ITEMS } from "./seed";
import { slugify } from "./slug";
import type {
  AppSettings,
  AuditLog,
  Collection,
  HydratedItem,
  ImportJob,
  LibrarySnapshot,
  Reminder,
  SavedItem,
  SavedItemCollection,
  SavedItemTag,
  Tag,
  UserProfile,
} from "./types";
import { canonicalizeUrl, detectSourceType, identityKey, inferCreatorFromUrl } from "./urls";

const DB_NAME = "reelvault";
const DB_VERSION = 2;

export interface ReelVaultDB extends DBSchema {
  users: {
    key: string;
    value: UserProfile;
  };
  items: {
    key: string;
    value: SavedItem;
    indexes: { userId: string; canonicalUrl: string; savedAt: string; identityKey: string };
  };
  collections: {
    key: string;
    value: Collection;
    indexes: { userId: string; slug: string };
  };
  tags: {
    key: string;
    value: Tag;
    indexes: { userId: string; slug: string };
  };
  itemCollections: {
    key: [string, string];
    value: SavedItemCollection;
    indexes: { itemId: string; collectionId: string };
  };
  itemTags: {
    key: [string, string];
    value: SavedItemTag;
    indexes: { itemId: string; tagId: string };
  };
  reminders: {
    key: string;
    value: Reminder;
    indexes: { userId: string; itemId: string };
  };
  importJobs: {
    key: string;
    value: ImportJob;
    indexes: { userId: string };
  };
  auditLogs: {
    key: string;
    value: AuditLog;
    indexes: { userId: string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<ReelVaultDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<ReelVaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains("users")) {
          db.createObjectStore("users", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("items")) {
          const items = db.createObjectStore("items", { keyPath: "id" });
          items.createIndex("userId", "userId");
          items.createIndex("canonicalUrl", "canonicalUrl");
          items.createIndex("savedAt", "savedAt");
          items.createIndex("identityKey", "identityKey");
        } else if (oldVersion < 2 && !transaction.objectStore("items").indexNames.contains("identityKey")) {
          transaction.objectStore("items").createIndex("identityKey", "identityKey");
        }
        if (!db.objectStoreNames.contains("collections")) {
          const collections = db.createObjectStore("collections", { keyPath: "id" });
          collections.createIndex("userId", "userId");
          collections.createIndex("slug", "slug");
        }
        if (!db.objectStoreNames.contains("tags")) {
          const tags = db.createObjectStore("tags", { keyPath: "id" });
          tags.createIndex("userId", "userId");
          tags.createIndex("slug", "slug");
        }
        if (!db.objectStoreNames.contains("itemCollections")) {
          const join = db.createObjectStore("itemCollections", {
            keyPath: ["itemId", "collectionId"],
          });
          join.createIndex("itemId", "itemId");
          join.createIndex("collectionId", "collectionId");
        }
        if (!db.objectStoreNames.contains("itemTags")) {
          const join = db.createObjectStore("itemTags", {
            keyPath: ["itemId", "tagId"],
          });
          join.createIndex("itemId", "itemId");
          join.createIndex("tagId", "tagId");
        }
        if (!db.objectStoreNames.contains("reminders")) {
          const reminders = db.createObjectStore("reminders", { keyPath: "id" });
          reminders.createIndex("userId", "userId");
          reminders.createIndex("itemId", "itemId");
        }
        if (!db.objectStoreNames.contains("importJobs")) {
          const jobs = db.createObjectStore("importJobs", { keyPath: "id" });
          jobs.createIndex("userId", "userId");
        }
        if (!db.objectStoreNames.contains("auditLogs")) {
          const logs = db.createObjectStore("auditLogs", { keyPath: "id" });
          logs.createIndex("userId", "userId");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "userId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function loadSnapshot(): Promise<LibrarySnapshot> {
  const db = await getDb();
  const [users, items, collections, tags, itemCollections, itemTags, reminders, importJobs, auditLogs, settingsRows] =
    await Promise.all([
      db.getAll("users"),
      db.getAll("items"),
      db.getAll("collections"),
      db.getAll("tags"),
      db.getAll("itemCollections"),
      db.getAll("itemTags"),
      db.getAll("reminders"),
      db.getAll("importJobs"),
      db.getAll("auditLogs"),
      db.getAll("settings"),
    ]);
  return {
    user: users[0] ?? null,
    items,
    collections,
    tags,
    itemCollections,
    itemTags,
    reminders,
    importJobs,
    auditLogs,
    settings: settingsRows[0] ?? null,
  };
}

export function defaultSettings(userId: string): AppSettings {
  return {
    userId,
    theme: "system",
    viewMode: "grid",
    allowPreviewFetch: false,
    allowAiSuggestions: false,
    allowAiIncludeNotes: false,
    allowAnalytics: false,
    lastRoute: "/inbox",
    lastQuery: "",
    seedInstalled: false,
  };
}

export async function createLocalUser(displayName: string, email?: string) {
  const db = await getDb();
  const user: UserProfile = {
    id: nanoid(),
    displayName: displayName.trim() || "You",
    email: email?.trim() || undefined,
    createdAt: isoNow(),
    mode: "local",
  };
  const settings = defaultSettings(user.id);
  const collections = DEFAULT_COLLECTIONS.map((c) => ({
    id: nanoid(),
    userId: user.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    color: c.color,
    isSystem: c.isSystem,
    systemKey: "systemKey" in c ? c.systemKey : undefined,
    createdAt: isoNow(),
    updatedAt: isoNow(),
  })) satisfies Collection[];

  const tx = db.transaction(["users", "settings", "collections", "auditLogs"], "readwrite");
  await tx.objectStore("users").put(user);
  await tx.objectStore("settings").put(settings);
  for (const collection of collections) {
    await tx.objectStore("collections").put(collection);
  }
  await tx.objectStore("auditLogs").put({
    id: nanoid(),
    userId: user.id,
    action: "consent_change",
    detail: "Local library created. Cloud sync off. Instagram credentials never requested.",
    createdAt: isoNow(),
  } satisfies AuditLog);
  await tx.done;
  return { user, settings, collections };
}

export async function installSeed(userId: string) {
  const snapshot = await loadSnapshot();
  if (snapshot.settings?.seedInstalled) return snapshot;
  const collectionByName = new Map(snapshot.collections.map((c) => [c.name, c]));

  for (const seed of SEED_ITEMS) {
    const savedAt = new Date(Date.now() - seed.daysAgo * 86_400_000).toISOString();
    const lastOpenedAt =
      seed.lastOpenedDaysAgo != null
        ? new Date(Date.now() - seed.lastOpenedDaysAgo * 86_400_000).toISOString()
        : undefined;
    const item = await saveItemRecord({
      userId,
      sourceUrl: seed.sourceUrl,
      title: seed.title,
      creatorName: seed.creatorName,
      userNote: seed.userNote,
      captionText: seed.captionText,
      transcriptText: seed.transcriptText,
      sourceType: seed.sourceType,
      availabilityStatus: seed.availabilityStatus ?? "saved",
      savedAt,
      lastOpenedAt,
      openCount: seed.openCount,
      isFavorite: Boolean(seed.isFavorite),
      isPinned: Boolean(seed.isPinned),
      needsReview: Boolean(seed.needsReview || (!seed.userNote && seed.tags.length === 0)),
    });
    for (const name of seed.collections) {
      const collection = collectionByName.get(name);
      if (collection) await addItemToCollection(item.id, collection.id);
    }
    for (const name of seed.tags) {
      const tag = await ensureTag(userId, name);
      await addTagToItem(item.id, tag.id, "import");
    }
  }

  const db = await getDb();
  const settings = snapshot.settings ?? defaultSettings(userId);
  await db.put("settings", { ...settings, seedInstalled: true });
  await writeAudit(userId, "import", "Installed sample library for first-run exploration.");
  return loadSnapshot();
}

interface SaveInput {
  userId: string;
  sourceUrl: string;
  title?: string;
  creatorName?: string;
  thumbnailUrl?: string;
  userNote?: string;
  captionText?: string;
  transcriptText?: string;
  sourceType?: SavedItem["sourceType"];
  availabilityStatus?: SavedItem["availabilityStatus"];
  savedAt?: string;
  lastOpenedAt?: string;
  openCount?: number;
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  needsReview?: boolean;
  metadataJson?: Record<string, unknown>;
}

export async function findDuplicate(sourceUrl: string): Promise<SavedItem | undefined> {
  const db = await getDb();
  const key = identityKey(sourceUrl);
  if (key) {
    const byKey = await db.getFromIndex("items", "identityKey", key);
    if (byKey) return byKey;
  }
  const canonical = canonicalizeUrl(sourceUrl);
  if (!canonical) return undefined;
  const byCanonical = await db.getFromIndex("items", "canonicalUrl", canonical);
  if (byCanonical) return byCanonical;
  const all = await db.getAll("items");
  return all.find((item) => (key && (item.identityKey === key || identityKey(item.sourceUrl) === key)));
}

export async function saveItemRecord(input: SaveInput): Promise<SavedItem> {
  const canonical = canonicalizeUrl(input.sourceUrl);
  if (!canonical) throw new Error("That does not look like a valid URL.");
  const item: SavedItem = {
    id: nanoid(),
    userId: input.userId,
    sourceUrl: input.sourceUrl.trim(),
    canonicalUrl: canonical,
    identityKey: identityKey(input.sourceUrl) ?? canonical,
    sourceType: input.sourceType ?? detectSourceType(input.sourceUrl),
    creatorName: input.creatorName || inferCreatorFromUrl(input.sourceUrl),
    title: input.title,
    thumbnailUrl: input.thumbnailUrl,
    savedAt: input.savedAt ?? isoNow(),
    lastOpenedAt: input.lastOpenedAt,
    openCount: input.openCount ?? 0,
    availabilityStatus: input.availabilityStatus ?? "saved",
    userNote: input.userNote,
    captionText: input.captionText,
    transcriptText: input.transcriptText,
    metadataJson: input.metadataJson,
    isFavorite: Boolean(input.isFavorite),
    isPinned: Boolean(input.isPinned),
    isArchived: Boolean(input.isArchived),
    needsReview: input.needsReview ?? (!input.userNote && !input.title),
  };
  const db = await getDb();
  await db.put("items", item);
  return item;
}

export async function updateItemRecord(item: SavedItem) {
  const db = await getDb();
  await db.put("items", item);
}

export async function deleteItemRecord(itemId: string, userId: string) {
  const db = await getDb();
  const tx = db.transaction(["items", "itemCollections", "itemTags", "reminders", "auditLogs"], "readwrite");
  await tx.objectStore("items").delete(itemId);
  const joins = await tx.objectStore("itemCollections").index("itemId").getAll(itemId);
  for (const join of joins) {
    await tx.objectStore("itemCollections").delete([join.itemId, join.collectionId]);
  }
  const tagJoins = await tx.objectStore("itemTags").index("itemId").getAll(itemId);
  for (const join of tagJoins) {
    await tx.objectStore("itemTags").delete([join.itemId, join.tagId]);
  }
  const reminders = await tx.objectStore("reminders").index("itemId").getAll(itemId);
  for (const reminder of reminders) {
    await tx.objectStore("reminders").delete(reminder.id);
  }
  await tx.objectStore("auditLogs").put({
    id: nanoid(),
    userId,
    action: "delete_item",
    detail: `Deleted item ${itemId}`,
    createdAt: isoNow(),
  });
  await tx.done;
}

export async function addItemToCollection(itemId: string, collectionId: string) {
  const db = await getDb();
  await db.put("itemCollections", { itemId, collectionId, addedAt: isoNow() });
}

export async function removeItemFromCollection(itemId: string, collectionId: string) {
  const db = await getDb();
  await db.delete("itemCollections", [itemId, collectionId]);
}

export async function ensureTag(userId: string, name: string): Promise<Tag> {
  const db = await getDb();
  const slug = slugify(name);
  const existing = (await db.getAllFromIndex("tags", "userId", userId)).find((t) => t.slug === slug);
  if (existing) return existing;
  const tag: Tag = { id: nanoid(), userId, name: name.trim(), slug, createdAt: isoNow() };
  await db.put("tags", tag);
  return tag;
}

export async function addTagToItem(
  itemId: string,
  tagId: string,
  source: SavedItemTag["source"] = "user",
) {
  const db = await getDb();
  await db.put("itemTags", { itemId, tagId, addedAt: isoNow(), source });
}

export async function removeTagFromItem(itemId: string, tagId: string) {
  const db = await getDb();
  await db.delete("itemTags", [itemId, tagId]);
}

export async function createCollectionRecord(
  userId: string,
  name: string,
  description?: string,
  color = "#1F5C4D",
) {
  const db = await getDb();
  const collection: Collection = {
    id: nanoid(),
    userId,
    name: name.trim(),
    slug: slugify(name),
    description,
    color,
    isSystem: false,
    createdAt: isoNow(),
    updatedAt: isoNow(),
  };
  await db.put("collections", collection);
  return collection;
}

export async function updateCollectionRecord(collection: Collection) {
  const db = await getDb();
  await db.put("collections", { ...collection, updatedAt: isoNow() });
}

export async function deleteCollectionRecord(collectionId: string) {
  const db = await getDb();
  const tx = db.transaction(["collections", "itemCollections"], "readwrite");
  const collection = await tx.objectStore("collections").get(collectionId);
  if (collection?.isSystem) {
    await tx.done;
    throw new Error("System collections cannot be deleted.");
  }
  await tx.objectStore("collections").delete(collectionId);
  const joins = await tx.objectStore("itemCollections").index("collectionId").getAll(collectionId);
  for (const join of joins) {
    await tx.objectStore("itemCollections").delete([join.itemId, join.collectionId]);
  }
  await tx.done;
}

export async function mergeCollections(sourceId: string, targetId: string) {
  if (sourceId === targetId) return;
  const db = await getDb();
  const tx = db.transaction(["collections", "itemCollections"], "readwrite");
  const source = await tx.objectStore("collections").get(sourceId);
  if (source?.isSystem) {
    await tx.done;
    throw new Error("System collections cannot be merged away.");
  }
  const joins = await tx.objectStore("itemCollections").index("collectionId").getAll(sourceId);
  for (const join of joins) {
    await tx.objectStore("itemCollections").put({
      itemId: join.itemId,
      collectionId: targetId,
      addedAt: join.addedAt,
    });
    await tx.objectStore("itemCollections").delete([join.itemId, join.collectionId]);
  }
  await tx.objectStore("collections").delete(sourceId);
  await tx.done;
}

export async function renameTagRecord(tag: Tag, name: string) {
  const db = await getDb();
  await db.put("tags", { ...tag, name: name.trim(), slug: slugify(name) });
}

export async function deleteTagRecord(tagId: string) {
  const db = await getDb();
  const tx = db.transaction(["tags", "itemTags"], "readwrite");
  await tx.objectStore("tags").delete(tagId);
  const joins = await tx.objectStore("itemTags").index("tagId").getAll(tagId);
  for (const join of joins) {
    await tx.objectStore("itemTags").delete([join.itemId, join.tagId]);
  }
  await tx.done;
}

export async function upsertReminder(input: Omit<Reminder, "id" | "createdAt"> & { id?: string }) {
  const db = await getDb();
  const reminder: Reminder = {
    id: input.id ?? nanoid(),
    userId: input.userId,
    itemId: input.itemId,
    remindAt: input.remindAt,
    note: input.note,
    completedAt: input.completedAt,
    createdAt: isoNow(),
  };
  await db.put("reminders", reminder);
  return reminder;
}

export async function writeSettings(settings: AppSettings) {
  const db = await getDb();
  await db.put("settings", settings);
}

export async function writeAudit(
  userId: string,
  action: AuditLog["action"],
  detail: string,
) {
  const db = await getDb();
  await db.put("auditLogs", {
    id: nanoid(),
    userId,
    action,
    detail,
    createdAt: isoNow(),
  });
}

export async function recordImportJob(job: ImportJob) {
  const db = await getDb();
  await db.put("importJobs", job);
}

export async function deleteAllUserData() {
  const db = await getDb();
  const names = db.objectStoreNames;
  const tx = db.transaction(Array.from(names), "readwrite");
  await Promise.all(Array.from(names).map((name) => tx.objectStore(name).clear()));
  await tx.done;
}

export function hydrateItems(snapshot: LibrarySnapshot): HydratedItem[] {
  const collectionsById = new Map(snapshot.collections.map((c) => [c.id, c]));
  const tagsById = new Map(snapshot.tags.map((t) => [t.id, t]));
  const collectionsByItem = new Map<string, Collection[]>();
  const tagsByItem = new Map<string, Tag[]>();
  for (const join of snapshot.itemCollections) {
    const collection = collectionsById.get(join.collectionId);
    if (!collection) continue;
    const list = collectionsByItem.get(join.itemId) ?? [];
    list.push(collection);
    collectionsByItem.set(join.itemId, list);
  }
  for (const join of snapshot.itemTags) {
    const tag = tagsById.get(join.tagId);
    if (!tag) continue;
    const list = tagsByItem.get(join.itemId) ?? [];
    list.push(tag);
    tagsByItem.set(join.itemId, list);
  }
  const reminderByItem = new Map(
    snapshot.reminders
      .filter((r) => !r.completedAt)
      .map((r) => [r.itemId, r]),
  );
  return snapshot.items.map((item) => ({
    ...item,
    collections: collectionsByItem.get(item.id) ?? [],
    tags: tagsByItem.get(item.id) ?? [],
    reminder: reminderByItem.get(item.id),
  }));
}
