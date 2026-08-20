import { localSuggest } from "@/lib/suggest";
import type { AiSuggestionRequest } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AiSuggestionRequest;
  const fallback = localSuggest(body);

  if (!process.env.XAI_API_KEY) {
    return NextResponse.json({
      ...fallback,
      rationale: "On-device suggestions. Set XAI_API_KEY to enable SpaceXAI.",
    });
  }

  if (!body.includeNote) body.userNote = undefined;
  body.captionText = body.captionText?.slice(0, 2000);
  body.transcriptText = body.transcriptText?.slice(0, 2000);
  body.userNote = body.userNote?.slice(0, 2000);
  body.existingCollections = (body.existingCollections ?? []).slice(0, 20);

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL ?? "grok-4.6",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You suggest tags and collection labels for a personal knowledge library. Return compact JSON {tags: string[], collections: string[]}. Never invent private facts. Prefer existing collection names when relevant. Max 6 tags and 3 collections.",
          },
          {
            role: "user",
            content: JSON.stringify({
              title: body.title,
              creatorName: body.creatorName,
              sourceType: body.sourceType,
              captionText: body.captionText,
              transcriptText: body.transcriptText,
              userNote: body.includeNote ? body.userNote : undefined,
              existingCollections: body.existingCollections,
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`xAI ${response.status}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = extractJson(text);
    return NextResponse.json({
      tags: unique(parsed.tags ?? fallback.tags).slice(0, 6),
      collections: unique(parsed.collections ?? fallback.collections).slice(0, 3),
    });
  } catch {
    return NextResponse.json({
      ...fallback,
      rationale: "SpaceXAI request failed; used on-device suggestions.",
    });
  }
}

function extractJson(text: string): { tags?: string[]; collections?: string[] } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as { tags?: string[]; collections?: string[] };
  } catch {
    return {};
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}
