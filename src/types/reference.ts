export const REFERENCE_TYPES = ["BACKGROUND", "PRODUCT", "OUTFIT", "POSE", "CUSTOM"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export type ReferenceItem = {
  id: string;
  creatorId: string;
  type: ReferenceType;
  name: string;
  description: string;
  imageUrl?: string; // signed URL for display
  s3Key: string;     // raw S3 key
  tags: string[];
  usageCount: number;
  createdAt: string;
};

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  BACKGROUND: "Background",
  PRODUCT: "Product",
  OUTFIT: "Outfit",
  POSE: "Pose",
  CUSTOM: "Custom",
};
