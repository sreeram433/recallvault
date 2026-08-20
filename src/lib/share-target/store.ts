import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ShareContentType } from "./validate";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "share-target-store.json");

export interface ShareTargetRecord {
  id: string;
  userId: string;
  sourceUrl: string;
  canonicalUrl: string;
  identityKey: string;
  contentType: ShareContentType;
  sourcePlatform: "instagram" | "web";
  provenance: "user_shared";
  captureSource: string;
  title?: string;
  userNote?: string;
  creatorName?: string;
  tags: string[];
  collection?: string;
  favorite: boolean;
  uploadId: string;
  savedAt: string;
  sourceStatus: "saved";
}

export interface AuditEvent {
  id: string;
  userId: string;
  action: "share_target_import" | "pairing_created" | "pairing_redeemed";
  urlHash?: string;
  itemId?: string;
  createdAt: string;
}

interface Session {
  tokenHash: string;
  userId: string;
  createdAt: string;
}

interface Pairing {
  code: string;
  userId: string;
  displayName: string;
  expiresAt: string;
}

interface IdempotencyRow {
  userId: string;
  key: string;
  bodyHash: string;
  status: number;
  response: unknown;
  createdAt: string;
}

interface StoreFile {
  users: Array<{ id: string; displayName: string; createdAt: string }>;
  sessions: Session[];
  pairings: Pairing[];
  items: ShareTargetRecord[];
  idempotency: IdempotencyRow[];
  audit: AuditEvent[];
}

const EMPTY: StoreFile = {
  users: [],
  sessions: [],
  pairings: [],
  items: [],
  idempotency: [],
  audit: [],
};

async function load(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return { ...EMPTY, ...(JSON.parse(raw) as StoreFile) };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function save(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export function hashSecret(value: string): string {
  return scryptSync(value, "recallvault-share-target", 32).toString("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function createPairing(displayName: string) {
  const store = await load();
  const userId = randomUUID();
  const code = randomBytes(4)
    .toString("hex")
    .slice(0, 6)
    .toUpperCase();
  store.users.push({ id: userId, displayName, createdAt: new Date().toISOString() });
  store.pairings = store.pairings.filter((p) => new Date(p.expiresAt) > new Date());
  store.pairings.push({
    code,
    userId,
    displayName,
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  store.audit.push({
    id: randomUUID(),
    userId,
    action: "pairing_created",
    createdAt: new Date().toISOString(),
  });
  await save(store);
  return { pairingCode: code, expiresInSeconds: 600, userId };
}

export async function redeemPairing(code: string) {
  const store = await load();
  const pairing = store.pairings.find((p) => p.code === code && new Date(p.expiresAt) > new Date());
  if (!pairing) return null;
  store.pairings = store.pairings.filter((p) => p.code !== code);
  const token = randomBytes(24).toString("hex");
  store.sessions.push({
    tokenHash: hashSecret(token),
    userId: pairing.userId,
    createdAt: new Date().toISOString(),
  });
  store.audit.push({
    id: randomUUID(),
    userId: pairing.userId,
    action: "pairing_redeemed",
    createdAt: new Date().toISOString(),
  });
  await save(store);
  return { token, userId: pairing.userId, displayName: pairing.displayName };
}

export async function userFromBearer(header: string | null) {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  const store = await load();
  const hashed = hashSecret(token);
  const session = store.sessions.find((s) => safeEqual(s.tokenHash, hashed));
  return session?.userId ?? null;
}

export async function findIdempotent(userId: string, key: string, bodyHash: string) {
  const store = await load();
  const row = store.idempotency.find((r) => r.userId === userId && r.key === key);
  if (!row) return { kind: "miss" as const };
  if (row.bodyHash !== bodyHash) return { kind: "conflict" as const };
  return { kind: "hit" as const, status: row.status, response: row.response };
}

export async function rememberIdempotent(
  userId: string,
  key: string,
  bodyHash: string,
  status: number,
  response: unknown,
) {
  const store = await load();
  store.idempotency.push({
    userId,
    key,
    bodyHash,
    status,
    response,
    createdAt: new Date().toISOString(),
  });
  if (store.idempotency.length > 500) store.idempotency.splice(0, store.idempotency.length - 500);
  await save(store);
}

export async function findItemByIdentity(userId: string, identityKey: string) {
  const store = await load();
  return store.items.find((item) => item.userId === userId && item.identityKey === identityKey);
}

export async function insertShareItem(item: ShareTargetRecord, urlHash: string) {
  const store = await load();
  store.items.push(item);
  store.audit.push({
    id: randomUUID(),
    userId: item.userId,
    action: "share_target_import",
    urlHash,
    itemId: item.id,
    createdAt: new Date().toISOString(),
  });
  await save(store);
  return item;
}
