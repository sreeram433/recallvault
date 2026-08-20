import type { ExportRecord, HydratedItem } from "./types";

export function toExportRecord(item: HydratedItem): ExportRecord {
  return {
    title: item.title ?? "",
    url: item.sourceUrl,
    canonicalUrl: item.canonicalUrl,
    creator: item.creatorName ?? "",
    sourceType: item.sourceType,
    notes: item.userNote ?? "",
    tags: item.tags.map((t) => t.name).join("; "),
    collections: item.collections.map((c) => c.name).join("; "),
    savedAt: item.savedAt,
    lastOpenedAt: item.lastOpenedAt ?? "",
    openCount: item.openCount,
    availabilityStatus: item.availabilityStatus,
    caption: item.captionText ?? "",
    transcript: item.transcriptText ?? "",
    favorite: item.isFavorite,
  };
}

export function toCsv(records: ExportRecord[]): string {
  const headers: Array<keyof ExportRecord> = [
    "title",
    "url",
    "canonicalUrl",
    "creator",
    "sourceType",
    "notes",
    "tags",
    "collections",
    "savedAt",
    "lastOpenedAt",
    "openCount",
    "availabilityStatus",
    "caption",
    "transcript",
    "favorite",
  ];
  const lines = [headers.join(",")];
  for (const record of records) {
    lines.push(headers.map((key) => csvCell(record[key])).join(","));
  }
  return lines.join("\n");
}

function csvCell(value: string | number | boolean): string {
  const raw = String(value ?? "");
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function toMarkdown(records: ExportRecord[]): string {
  const lines = [
    "# ReelVault export",
    "",
    `Exported ${records.length} items. Original Instagram media is not included.`,
    "",
  ];
  for (const record of records) {
    const title = record.title || record.creator || record.url;
    lines.push(`## ${title}`);
    lines.push("");
    lines.push(`- URL: ${record.url}`);
    if (record.creator) lines.push(`- Creator: ${record.creator}`);
    lines.push(`- Type: ${record.sourceType}`);
    lines.push(`- Saved: ${record.savedAt}`);
    lines.push(`- Status: ${record.availabilityStatus}`);
    if (record.collections) lines.push(`- Collections: ${record.collections}`);
    if (record.tags) lines.push(`- Tags: ${record.tags}`);
    if (record.notes) {
      lines.push("");
      lines.push(record.notes);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function toJson(records: ExportRecord[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "ReelVault",
      disclaimer:
        "This file contains your metadata only. Original posts remain on Instagram and are not copied.",
      items: records,
    },
    null,
    2,
  );
}

export function downloadText(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
