import { pairingRedeemSchema } from "@/lib/share-target/schema";
import { rateLimit } from "@/lib/share-target/rate-limit";
import { redeemPairing } from "@/lib/share-target/store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`redeem:${ip}`, 20, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many redeem attempts." }, { status: 429 });
  }
  const body = pairingRedeemSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Enter the 6-character pairing code." }, { status: 400 });
  }
  const result = await redeemPairing(body.data.pairingCode);
  if (!result) {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 401 });
  }
  return NextResponse.json({
    token: result.token,
    userId: result.userId,
    displayName: result.displayName,
  });
}
