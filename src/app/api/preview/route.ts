import { detectSourceType, safeUrl } from "@/lib/urls";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 4000;
const MAX_BYTES = 512_000;
const ALLOWED_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

export async function GET() {
  return NextResponse.json(
    { error: "GET preview is retired. Use POST /api/preview with a JSON body." },
    { status: 410 },
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const url = safeUrl(body?.url ?? "");
  if (!url) {
    return NextResponse.json({ error: "Enter a valid public URL." }, { status: 400 });
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return NextResponse.json(
      {
        error: "Preview only fetches public Instagram pages. Save web links with your own title and note.",
        sourceType: detectSourceType(url.toString()),
      },
      { status: 400 },
    );
  }

  if (await isPrivateHostname(host)) {
    return NextResponse.json({ error: "That host is not allowed." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "error",
      headers: {
        "User-Agent": "ReelVaultPreview/0.1 (+http://localhost:3000/privacy; public metadata only)",
        Accept: "text/html",
      },
      cache: "no-store",
    });
    const html = (await response.text()).slice(0, MAX_BYTES);
    const title = pickMeta(html, "og:title") || pickTitle(html);
    const description = pickMeta(html, "og:description");
    const thumbnailUrl = pickMeta(html, "og:image");
    const creatorName =
      pickMeta(html, "og:site_name") ||
      html.match(/instagram.com\/([A-Za-z0-9._]+)/)?.[1];
    return NextResponse.json({
      title,
      description,
      thumbnailUrl,
      creatorName,
      sourceType: detectSourceType(url.toString()),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Public preview was blocked or timed out. Save the URL anyway — titles and notes still work.",
        sourceType: detectSourceType(url.toString()),
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}

async function isPrivateHostname(hostname: string): Promise<boolean> {
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return true;
  }
  if (isPrivateIp(hostname)) return true;
  try {
    const records = await lookup(hostname, { all: true });
    return records.some((record) => isPrivateIp(record.address));
  } catch {
    return true;
  }
}

function isPrivateIp(address: string): boolean {
  const ip = isIP(address);
  if (!ip) return false;
  if (ip === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  );
}

function pickMeta(html: string, property: string): string | undefined {
  const propertyMatch = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
  );
  const reverse = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  );
  return decode(propertyMatch?.[1] || reverse?.[1]);
}

function pickTitle(html: string): string | undefined {
  return decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);
}

function decode(value?: string) {
  if (!value) return undefined;
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
