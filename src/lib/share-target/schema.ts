import { z } from "zod";
import { MAX_NOTE_LENGTH, MAX_TAG_LENGTH, MAX_TAGS, MAX_TITLE_LENGTH, MAX_URL_LENGTH } from "./validate";

export const shareTargetImportSchema = z.object({
  sourceUrl: z.string().min(1).max(MAX_URL_LENGTH),
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  userNote: z.string().max(MAX_NOTE_LENGTH).optional(),
  creatorName: z.string().max(120).optional(),
  tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS).optional(),
  collection: z.string().max(80).optional(),
  favorite: z.boolean().optional(),
  uploadId: z.string().uuid(),
  clientSavedAt: z.string().optional(),
  captureSource: z
    .enum(["android_share_target", "ios_share_extension", "web_fallback"])
    .default("android_share_target"),
});

export type ShareTargetImportBody = z.infer<typeof shareTargetImportSchema>;

export const pairingStartSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
});

export const pairingRedeemSchema = z.object({
  pairingCode: z.string().regex(/^[A-Z0-9]{6}$/),
});
