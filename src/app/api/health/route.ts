import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "reelvault",
    instagramLogin: false,
    scraping: false,
  });
}
