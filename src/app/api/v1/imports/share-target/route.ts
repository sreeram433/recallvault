import { shareTargetImportSchema } from "@/lib/share-target/schema";
import { rateLimit } from "@/lib/share-target/rate-limit";
import {
  findIdempotent,
  findItemByIdentity,
  insertShareItem,
  rememberIdempotent,
  userFromBearer,
  type ShareTargetRecord,
} from "@/lib/share-target/store";
import { hashForAudit, parseSharedText, ShareValidationError } from "@/lib/share-target/validate";
import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: NextRequest) {
  if (!rateLimit(`share:${clientKey(request)}`, 30, 60 * 60_000)) {
    return json({ error: "Too many import attempts. Try again later." }, 429);
  }

  const userId = await userFromBearer(request.headers.get("authorization"));
  if (!userId) {
    return json(
      {
        error: "Authentication required before cloud sync.",
        code: "AUTH_REQUIRED",
        queueLocally: true,
      },
      401,
    );
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || !/^[0-9a-f-]{16,80}$/i.test(idempotencyKey)) {
    return json({ error: "Idempotency-Key header is required." }, 400);
  }

  const raw = await request.json().catch(() => null);
  const parsed = shareTargetImportSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Invalid request body.", issues: parsed.error.issues.map((i) => i.message) }, 400);
  }

  const body = parsed.data;
  const bodyHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const prior = await findIdempotent(userId, idempotencyKey, bodyHash);
  if (prior.kind === "conflict") {
    return json({ error: "Idempotency key reused with a different body." }, 409);
  }
  if (prior.kind === "hit") {
    return json(prior.response, prior.status);
  }

  let validated;
  try {
    validated = parseSharedText(body.sourceUrl);
  } catch (error) {
    const status = 400;
    const response = {
      error: error instanceof ShareValidationError ? error.message : "Invalid URL.",
      code: error instanceof ShareValidationError ? error.code : "malformed",
    };
    await rememberIdempotent(userId, idempotencyKey, bodyHash, status, response);
    return json(response, status);
  }

  const existing = await findItemByIdentity(userId, validated.identityKey);
  if (existing) {
    const response = {
      id: existing.id,
      status: "duplicate" as const,
      contentType: existing.contentType,
      sourcePlatform: existing.sourcePlatform,
      provenance: existing.provenance,
      duplicateOf: existing.id,
    };
    await rememberIdempotent(userId, idempotencyKey, bodyHash, 200, response);
    return json(response);
  }

  const record: ShareTargetRecord = {
    id: randomUUID(),
    userId,
    sourceUrl: validated.originalUrl,
    canonicalUrl: validated.canonicalUrl,
    identityKey: validated.identityKey,
    contentType: validated.contentType,
    sourcePlatform: validated.sourcePlatform,
    provenance: "user_shared",
    captureSource: body.captureSource,
    title: body.title,
    userNote: body.userNote,
    creatorName: body.creatorName,
    tags: body.tags ?? [],
    collection: body.collection,
    favorite: Boolean(body.favorite),
    uploadId: body.uploadId,
    savedAt: body.clientSavedAt ?? new Date().toISOString(),
    sourceStatus: "saved",
  };
  await insertShareItem(record, hashForAudit(validated.canonicalUrl));

  const response = {
    id: record.id,
    status: "saved" as const,
    contentType: record.contentType,
    sourcePlatform: record.sourcePlatform,
    provenance: record.provenance,
    inbox: true,
    duplicateOf: null,
  };
  await rememberIdempotent(userId, idempotencyKey, bodyHash, 201, response);
  return json(response, 201);
}

export async function GET() {
  return json({
    ok: true,
    accepts: "POST application/json",
    auth: "Bearer session from /api/v1/auth/pairing",
    fetchesUrl: false,
    instagramLogin: false,
  });
}


