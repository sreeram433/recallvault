export const APP_NAME = "ReelVault";
export const APP_TAGLINE = "Save a Reel once. Find it later in seconds.";

export const DEFAULT_COLLECTIONS = [
  {
    name: "Inbox",
    slug: "inbox",
    color: "#8A8175",
    isSystem: true,
    systemKey: "inbox" as const,
    description: "Every newly saved link lands here until you file it.",
  },
  {
    name: "Watch Later",
    slug: "watch-later",
    color: "#B0893A",
    isSystem: true,
    systemKey: "watch_later" as const,
    description: "A short queue of items you intend to open soon.",
  },
  {
    name: "Needs Review",
    slug: "needs-review",
    color: "#8F3D32",
    isSystem: true,
    systemKey: "needs_review" as const,
    description: "Items missing a note, tag, or collection.",
  },
  {
    name: "Coding",
    slug: "coding",
    color: "#1F5C4D",
    isSystem: false,
    description: "Tutorials, snippets, and debugging references.",
  },
  {
    name: "AI/ML",
    slug: "ai-ml",
    color: "#355C7D",
    isSystem: false,
    description: "Models, papers-in-reel-form, and project ideas.",
  },
  {
    name: "College",
    slug: "college",
    color: "#5C4B3A",
    isSystem: false,
    description: "Study methods, campus life, and assignments.",
  },
  {
    name: "Recipes",
    slug: "recipes",
    color: "#A35A3A",
    isSystem: false,
    description: "Cooking references you actually want to make.",
  },
  {
    name: "Fitness",
    slug: "fitness",
    color: "#3D6B4F",
    isSystem: false,
    description: "Workouts, form cues, and recovery notes.",
  },
  {
    name: "Travel",
    slug: "travel",
    color: "#2F5D73",
    isSystem: false,
    description: "Places, itineraries, and neighborhood tips.",
  },
  {
    name: "Editing Ideas",
    slug: "editing-ideas",
    color: "#6B3D6B",
    isSystem: false,
    description: "Hooks, cuts, captions, and audio references.",
  },
  {
    name: "Business",
    slug: "business",
    color: "#3F4E3A",
    isSystem: false,
    description: "Offers, positioning, and operator notes.",
  },
] as const;

export const SUGGESTED_TAGS = [
  "beginner",
  "python",
  "pytorch",
  "project-idea",
  "recipe",
  "high-protein",
  "hyderabad",
  "cafe",
  "workout",
  "hook",
  "thumbnail",
  "study",
  "watch-later",
];

export const NAV_ITEMS = [
  { href: "/inbox", label: "Inbox", hint: "New and unsorted saves" },
  { href: "/search", label: "Search", hint: "Find anything you kept" },
  { href: "/collections", label: "Collections", hint: "Topics you own" },
  { href: "/rediscover", label: "Rediscover", hint: "Old saves worth using" },
  { href: "/settings", label: "Settings", hint: "Privacy, export, consent" },
] as const;

export const PRIVACY_PILLARS = [
  "We never ask for your Instagram password.",
  "We never scrape your Saved tab or log in as you.",
  "Every capture is something you chose to send.",
  "Original posts stay on Instagram and may disappear later.",
  "Your notes, tags, and library belong to you.",
];
