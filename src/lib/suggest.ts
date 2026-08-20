import { DEFAULT_COLLECTIONS } from "./constants";
import type { SourceType } from "./types";

const RULES: Array<{ pattern: RegExp; tags: string[]; collections: string[] }> = [
  { pattern: /\b(python|pytorch|tensor|chatbot|sql|code|coding|hackathon|javascript|react)\b/i, tags: ["coding"], collections: ["Coding"] },
  { pattern: /\b(pytorch|ml|machine learning|model|embedding|llm|neural)\b/i, tags: ["ai", "beginner"], collections: ["AI/ML"] },
  { pattern: /\b(recipe|paneer|dal|cook|protein|dinner|meal prep)\b/i, tags: ["recipe"], collections: ["Recipes"] },
  { pattern: /\b(hyderabad|cafe|travel|itinerary|hotel|outdoor seating)\b/i, tags: ["travel"], collections: ["Travel"] },
  { pattern: /\b(workout|squat|fitness|form|gym|run)\b/i, tags: ["workout"], collections: ["Fitness"] },
  { pattern: /\b(hook|thumbnail|edit|caption|retention|color grade)\b/i, tags: ["editing"], collections: ["Editing Ideas"] },
  { pattern: /\b(study|exam|college|assignment|pomodoro|notes)\b/i, tags: ["study"], collections: ["College"] },
  { pattern: /\b(offer|business|pricing|customers|solo)\b/i, tags: ["business"], collections: ["Business"] },
];

export function localSuggest(input: {
  title?: string;
  creatorName?: string;
  sourceType: SourceType;
  captionText?: string;
  transcriptText?: string;
  userNote?: string;
  includeNote?: boolean;
}) {
  const haystack = [
    input.title,
    input.creatorName,
    input.captionText,
    input.transcriptText,
    input.sourceType,
    input.includeNote ? input.userNote : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tags = new Set<string>();
  const collections = new Set<string>();
  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) {
      rule.tags.forEach((t) => tags.add(t));
      rule.collections.forEach((c) => collections.add(c));
    }
  }
  if (input.sourceType === "instagram_reel" && collections.size === 0) {
    collections.add("Inbox");
  }
  const known = new Set<string>(DEFAULT_COLLECTIONS.map((c) => c.name));
  return {
    tags: Array.from(tags).slice(0, 6),
    collections: Array.from(collections).filter((c) => known.has(c)).slice(0, 3),
  };
}
