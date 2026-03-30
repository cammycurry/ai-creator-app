import { create } from "zustand";
import type { Creator } from "@/types/creator";
import type { CreditBalance } from "@/types/credits";
import type { ContentItem, ContentSetItem } from "@/types/content";
import type { ReferenceItem } from "@/types/reference";

type CreatorStore = {
  creators: Creator[];
  activeCreatorId: string | null;
  credits: CreditBalance;
  loaded: boolean;
  content: ContentItem[];
  contentSets: ContentSetItem[];
  isGeneratingContent: boolean;
  contentError: string | null;
  imageCount: number;
  setCreators: (creators: Creator[]) => void;
  setActiveCreator: (id: string) => void;
  addCreator: (creator: Creator) => void;
  removeCreator: (id: string) => void;
  getActiveCreator: () => Creator | undefined;
  setCredits: (credits: CreditBalance) => void;
  setLoaded: (loaded: boolean) => void;
  setContent: (content: ContentItem[]) => void;
  addContent: (items: ContentItem[]) => void;
  setContentSets: (sets: ContentSetItem[]) => void;
  addContentSet: (set: ContentSetItem) => void;
  setIsGeneratingContent: (v: boolean) => void;
  setContentError: (error: string | null) => void;
  setImageCount: (count: number) => void;
  references: ReferenceItem[];
  setReferences: (refs: ReferenceItem[]) => void;
  addReference: (ref: ReferenceItem) => void;
  removeReference: (id: string) => void;
  updateReferenceInStore: (id: string, updates: Partial<ReferenceItem>) => void;
};

export const useCreatorStore = create<CreatorStore>((set, get) => ({
  creators: [],
  activeCreatorId: null,
  credits: { planCredits: 0, packCredits: 0, total: 0 },
  loaded: false,
  content: [],
  contentSets: [],
  isGeneratingContent: false,
  contentError: null,
  imageCount: 1,

  setCreators: (creators) => set({ creators }),

  setActiveCreator: (id) => set({ activeCreatorId: id }),

  addCreator: (creator) =>
    set((state) => ({ creators: [...state.creators, creator] })),

  removeCreator: (id) =>
    set((state) => ({
      creators: state.creators.filter((c) => c.id !== id),
      activeCreatorId:
        state.activeCreatorId === id ? null : state.activeCreatorId,
    })),

  getActiveCreator: () => {
    const { creators, activeCreatorId } = get();
    return creators.find((c) => c.id === activeCreatorId);
  },

  setCredits: (credits) => set({ credits }),

  setLoaded: (loaded) => set({ loaded }),
  setContent: (content) => set({ content }),
  addContent: (items) => set((state) => ({ content: [...items, ...state.content] })),
  setContentSets: (contentSets) => set({ contentSets }),
  addContentSet: (contentSet) => set((state) => ({ contentSets: [contentSet, ...state.contentSets] })),
  setIsGeneratingContent: (isGeneratingContent) => set({ isGeneratingContent }),
  setContentError: (contentError) => set({ contentError }),
  setImageCount: (imageCount) => set({ imageCount: Math.min(Math.max(imageCount, 1), 4) }),
  references: [],
  setReferences: (references) => set({ references }),
  addReference: (ref) => set((state) => ({ references: [ref, ...state.references] })),
  removeReference: (id) => set((state) => ({ references: state.references.filter((r) => r.id !== id) })),
  updateReferenceInStore: (id, updates) => set((state) => ({
    references: state.references.map((r) => r.id === id ? { ...r, ...updates } : r),
  })),
}));
