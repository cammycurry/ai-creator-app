export type CreditBalance = {
  planCredits: number;
  packCredits: number;
  total: number;
};

export type ContentCostType =
  | "IMAGE"
  | "IMAGE_UPSCALE"
  | "VIDEO_5S"
  | "VIDEO_10S"
  | "VIDEO_5S_PREMIUM"
  | "VIDEO_10S_PREMIUM"
  | "VOICE"
  | "TALKING_HEAD"
  | "TALKING_HEAD_30S"
  | "MOTION_TRANSFER"
  | "UPSCALE_IMAGE"
  | "UPSCALE_VIDEO";

export type CreditCost = Record<ContentCostType, number>;

export const CREDIT_COSTS: CreditCost = {
  IMAGE: 1,
  IMAGE_UPSCALE: 1,
  VIDEO_5S: 3,
  VIDEO_10S: 5,
  VIDEO_5S_PREMIUM: 5,
  VIDEO_10S_PREMIUM: 8,
  VOICE: 2,
  TALKING_HEAD: 8,
  TALKING_HEAD_30S: 12,
  MOTION_TRANSFER: 5,
  UPSCALE_IMAGE: 1,
  UPSCALE_VIDEO: 2,
} as const;
