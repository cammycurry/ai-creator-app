export type TemplateCategory = "fitness" | "lifestyle" | "aesthetic" | "ugc";

export type CustomField = {
  key: string;
  label: string;
  type: "select" | "text";
  options?: string[];
  default?: string;
};

export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  icon: string;
  description: string;
  outputType: "IMAGE";
  creditsCost: number;
  scenePrompt: string;
  customizableFields: CustomField[];
  tags: string[];
};

// ─── Content Studio V3 Templates ──────────────────────────────

export type GenerationConfig = {
  contentType: "photo" | "video" | "carousel" | "talking-head";
  prompt: string;
  imageCount?: number;
  aspectRatio?: string;
  videoSource?: "text" | "photo" | "motion";
  videoDuration?: 5 | 10;
  videoAspectRatio?: string;
  formatId?: string;
  slideCount?: number;
  carouselInstructions?: string;
  voiceId?: string;
  talkingDuration?: 15 | 30;
  talkingSetting?: string;
  referenceKeys?: string[];
};

export type ContentTemplateItem = {
  id: string;
  type: string;
  name: string;
  description: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  sourceVideoUrl?: string;
  category: string;
  trend: string;
  tags: string[];
  generationConfig: GenerationConfig;
  popularity: number;
  createdAt: string;
};

export type TemplateTrend = {
  trend: string;
  count: number;
  category: string;
};

export const TEMPLATE_CATEGORIES = [
  "all",
  "gym-fitness",
  "city-lifestyle",
  "fashion-beauty",
  "travel",
  "general",
] as const;

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  "all": "All",
  "gym-fitness": "Gym & Fitness",
  "city-lifestyle": "City & Lifestyle",
  "fashion-beauty": "Fashion & Beauty",
  "travel": "Travel",
  "general": "General",
};
