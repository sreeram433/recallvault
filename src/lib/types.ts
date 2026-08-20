export const SOURCE_TYPES = [
  "instagram_reel",
  "instagram_post",
  "instagram_carousel",
  "instagram_profile",
  "instagram_story",
  "instagram_other",
  "web_link",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const AVAILABILITY_STATUSES = [
  "saved",
  "processing",
  "unavailable",
  "reported_dead",
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const SORT_OPTIONS = [
  "newest",
  "oldest",
  "recently_opened",
  "most_opened",
  "az",
  "relevance",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export const VIEW_MODES = ["grid", "list"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  createdAt: string;
  mode: "local" | "cloud";
}

export interface SavedItem {
  id: string;
  userId: string;
  sourceUrl: string;
  canonicalUrl: string;
  identityKey?: string;
  sourceType: SourceType;
  creatorName?: string;
  title?: string;
  thumbnailUrl?: string;
  savedAt: string;
  lastOpenedAt?: string;
  openCount: number;
  availabilityStatus: AvailabilityStatus;
  userNote?: string;
  captionText?: string;
  transcriptText?: string;
  metadataJson?: Record<string, unknown>;
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  needsReview: boolean;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  isSystem: boolean;
  systemKey?: "inbox" | "watch_later" | "needs_review";
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface SavedItemCollection {
  itemId: string;
  collectionId: string;
  addedAt: string;
}

export interface SavedItemTag {
  itemId: string;
  tagId: string;
  addedAt: string;
  source: "user" | "ai_suggested" | "import";
}

export interface Reminder {
  id: string;
  userId: string;
  itemId: string;
  remindAt: string;
  note?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ImportJob {
  id: string;
  userId: string;
  kind: "instagram_data_export" | "csv" | "json";
  status: "queued" | "processing" | "complete" | "failed";
  fileName: string;
  itemCount: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: "import" | "export" | "delete_item" | "delete_account" | "consent_change";
  detail: string;
  createdAt: string;
}

export interface AppSettings {
  userId: string;
  theme: "system" | "light" | "dark";
  viewMode: ViewMode;
  allowPreviewFetch: boolean;
  allowAiSuggestions: boolean;
  allowAiIncludeNotes: boolean;
  allowAnalytics: boolean;
  lastRoute: string;
  lastQuery: string;
  lastViewedItemId?: string;
  seedInstalled: boolean;
}

export interface LibrarySnapshot {
  user: UserProfile | null;
  items: SavedItem[];
  collections: Collection[];
  tags: Tag[];
  itemCollections: SavedItemCollection[];
  itemTags: SavedItemTag[];
  reminders: Reminder[];
  importJobs: ImportJob[];
  auditLogs: AuditLog[];
  settings: AppSettings | null;
}

export interface HydratedItem extends SavedItem {
  collections: Collection[];
  tags: Tag[];
  reminder?: Reminder;
  matchReasons?: string[];
}

export interface SearchFilters {
  query: string;
  sourceTypes: SourceType[];
  collectionIds: string[];
  tagIds: string[];
  creator: string;
  status: AvailabilityStatus[];
  favoritesOnly: boolean;
  archived: "hide" | "only" | "include";
  savedFrom?: string;
  savedTo?: string;
  openedFrom?: string;
  openedTo?: string;
  neverOpened: boolean;
  sort: SortOption;
}

export interface ParsedNaturalQuery {
  text: string;
  savedFrom?: string;
  savedTo?: string;
  sourceTypes: SourceType[];
  creator?: string;
  favoritesOnly?: boolean;
  neverOpened?: boolean;
}

export interface PreviewMetadata {
  title?: string;
  creatorName?: string;
  thumbnailUrl?: string;
  description?: string;
  sourceType: SourceType;
}

export interface AiSuggestionRequest {
  title?: string;
  creatorName?: string;
  sourceType: SourceType;
  captionText?: string;
  transcriptText?: string;
  userNote?: string;
  includeNote: boolean;
  existingCollections: string[];
}

export interface AiSuggestionResponse {
  tags: string[];
  collections: string[];
  rationale?: string;
}

export interface ExportRecord {
  title: string;
  url: string;
  canonicalUrl: string;
  creator: string;
  sourceType: SourceType;
  notes: string;
  tags: string;
  collections: string;
  savedAt: string;
  lastOpenedAt: string;
  openCount: number;
  availabilityStatus: AvailabilityStatus;
  caption: string;
  transcript: string;
  favorite: boolean;
}
