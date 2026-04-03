export const REFERENCE_TYPES = ["BACKGROUND", "REFERENCE"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export type ReferenceItem = {
  id: string;
  userId: string;
  creatorId: string | null;
  type: ReferenceType;
  name: string;
  description: string;
  imageUrl?: string;
  s3Key: string;
  tags: string[];
  starred: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  source: "UPLOAD" | "PUBLIC_SAVE" | "GENERATION_SAVE";
  sourcePublicRefId: string | null;
  createdAt: string;
};

export type PublicReferenceItem = {
  id: string;
  type: ReferenceType;
  name: string;
  description: string;
  imageUrl?: string;
  s3Key: string;
  tags: string[];
  category: string;
  popularity: number;
  saved?: boolean;
};

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  BACKGROUND: "Background",
  REFERENCE: "Reference",
};

export const LIBRARY_FILTERS = [
  { label: "All", filter: null },
  { label: "Backgrounds", filter: { type: "BACKGROUND" as const } },
  { label: "Outfits", filter: { tag: "outfit" } },
  { label: "Products", filter: { tag: "product" } },
  { label: "Poses", filter: { tag: "pose" } },
  { label: "Moods", filter: { tag: "mood" } },
] as const;

export const PUBLIC_CATEGORIES = [
  "all", "fitness", "lifestyle", "fashion", "beauty", "travel", "general",
] as const;
export type PublicCategory = (typeof PUBLIC_CATEGORIES)[number];
