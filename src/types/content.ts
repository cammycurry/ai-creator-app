export type ContentItem = {
  id: string;
  creatorId: string;
  type: "IMAGE" | "VIDEO" | "TALKING_HEAD";
  status: "GENERATING" | "COMPLETED" | "FAILED";
  url?: string;
  thumbnailUrl?: string;
  s3Keys: string[];
  source: "TEMPLATE" | "FREEFORM" | "RECREATE" | "WIZARD";
  prompt?: string;
  userInput?: string;
  creditsCost: number;
  createdAt: string;
};
