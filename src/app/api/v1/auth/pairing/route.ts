import { pairingStartSchema } from "@/lib/share-target/schema";
import { rateLimit } from "@/lib/share-target/rate-limit";
import { createPairing } from "@/lib/share-target/store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`pair:${ip}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many pairing attempts." }, { status: 429 });
  }
  const body = pairingStartSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid pairing request." }, { status: 400 });
  }
  const result = await createPairing(body.data.displayName?.trim() || "RecallVault user");
  return NextResponse.json({
    pairingCode: result.pairingCode,
    expiresInSeconds: result.expiresInSeconds,
  });
}
