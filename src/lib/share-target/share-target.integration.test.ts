import { afterEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST as importShare } from "@/app/api/v1/imports/share-target/route";
import { POST as startPairing } from "@/app/api/v1/auth/pairing/route";
import { POST as redeemPairing } from "@/app/api/v1/auth/pairing/redeem/route";

const DATA = path.join(process.cwd(), ".data", "share-target-store.json");

afterEach(async () => {
  await rm(DATA, { force: true });
});

function request(url: string, init: RequestInit) {
  return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1]);
}

async function pair() {
  const start = await startPairing(
    request("http://localhost/api/v1/auth/pairing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Test" }),
    }),
  );
  const { pairingCode } = (await start.json()) as { pairingCode: string };
  const redeem = await redeemPairing(
    request("http://localhost/api/v1/auth/pairing/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pairingCode }),
    }),
  );
  return (await redeem.json()) as { token: string; userId: string };
}

describe("POST /api/v1/imports/share-target", () => {
  it("rejects unauthenticated imports and tells the client to queue locally", async () => {
    const res = await importShare(
      request("http://localhost/api/v1/imports/share-target", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          sourceUrl: "https://instagram.com/reel/ABCDE12345",
          uploadId: crypto.randomUUID(),
        }),
      }),
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { queueLocally?: boolean };
    expect(body.queueLocally).toBe(true);
  });

  it("saves a user-shared Instagram URL without fetching it", async () => {
    const { token } = await pair();
    const uploadId = crypto.randomUUID();
    const res = await importShare(
      request("http://localhost/api/v1/imports/share-target", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "idempotency-key": uploadId,
        },
        body: JSON.stringify({
          sourceUrl: "https://www.instagram.com/reel/ABCDE12345/?igsh=1",
          userNote: "for later",
          uploadId,
          captureSource: "android_share_target",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      status: string;
      contentType: string;
      provenance: string;
      sourcePlatform: string;
    };
    expect(body.status).toBe("saved");
    expect(body.contentType).toBe("reel");
    expect(body.provenance).toBe("user_shared");
    expect(body.sourcePlatform).toBe("instagram");
  });

  it("replays the same idempotency key", async () => {
    const { token } = await pair();
    const uploadId = crypto.randomUUID();
    const headers = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "idempotency-key": uploadId,
    };
    const payload = {
      sourceUrl: "https://instagram.com/p/FGHIJ67890",
      uploadId,
      captureSource: "android_share_target",
    };
    const first = await importShare(
      request("http://localhost/api/v1/imports/share-target", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }),
    );
    const second = await importShare(
      request("http://localhost/api/v1/imports/share-target", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }),
    );
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await second.json()).toEqual(await first.json());
  });

  it("rejects private hosts", async () => {
    const { token } = await pair();
    const res = await importShare(
      request("http://localhost/api/v1/imports/share-target", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          sourceUrl: "http://127.0.0.1/admin",
          uploadId: crypto.randomUUID(),
        }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
