export type ContentRefAttachment = {
  refId: string;
  refName: string;
  refS3Key: string;
  mode: "exact" | "similar" | "vibe";
  what: "background" | "outfit" | "pose" | "all";
  description: string;
  vibeText?: string;
};

export type ContentSetItem = {
  id: string;
  creatorId: string;
  type: "CAROUSEL" | "PHOTO_SET";
  formatId?: string;
  caption?: string;
  hashtags: string[];
  slideCount: number;
  status: "GENERATING" | "COMPLETED" | "PARTIAL" | "FAILED";
  creditsCost: number;
  createdAt: string;
  slides: ContentItem[];
};

export type ContentItem = {
  id: string;
  creatorId: string;
  type: "IMAGE" | "VIDEO" | "TALKING_HEAD";
  status: "GENERATING" | "COMPLETED" | "FAILED";
  url?: string;
  thumbnailUrl?: string;
  s3Keys: string[];
  source: "TEMPLATE" | "FREEFORM" | "RECREATE" | "WIZARD" | "CAROUSEL";
  prompt?: string;
  userInput?: string;
  creditsCost: number;
  createdAt: string;
  contentSetId?: string;
  slideIndex?: number;
  refAttachments?: ContentRefAttachment[];
};
