export type CreditBalance = {
  planCredits: number;
  packCredits: number;
  total: number;
};

export type ContentCostType =
  | "IMAGE"
  | "IMAGE_UPSCALE"
  | "VIDEO"
  | "VOICE"
  | "TALKING_HEAD";

export type CreditCost = Record<ContentCostType, number>;

export const CREDIT_COSTS: CreditCost = {
  IMAGE: 1,
  IMAGE_UPSCALE: 1,
  VIDEO: 5,
  VOICE: 2,
  TALKING_HEAD: 8,
} as const;
