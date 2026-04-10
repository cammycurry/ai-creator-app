export type Creator = {
  id: string;
  userId: string;
  name: string;
  niche: string[];
  isPreMade: boolean;
  preMadeId?: string;
  baseImageUrl?: string;
  baseImageUpscaledUrl?: string;
  settings: Record<string, unknown>;
  referenceImages: { type: string; url: string }[];
  voiceId?: string;
  voiceProvider?: string;
  contentCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
};
