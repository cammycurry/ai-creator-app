import { create } from "zustand";

type AdminStore = {
  // Prompt lab state
  promptText: string;
  setPromptText: (text: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  imageCount: number;
  setImageCount: (count: number) => void;
  testLabel: string;
  setTestLabel: (label: string) => void;

  // Compare
  compareIds: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;

  // Lightbox
  lightboxSrc: string | null;
  openLightbox: (src: string) => void;
  closeLightbox: () => void;
};

export const useAdminStore = create<AdminStore>((set) => ({
  promptText: "",
  setPromptText: (text) => set({ promptText: text }),
  selectedModel: "gemini-3-pro-image-preview",
  setSelectedModel: (model) => set({ selectedModel: model }),
  imageCount: 4,
  setImageCount: (count) => set({ imageCount: count }),
  testLabel: "",
  setTestLabel: (label) => set({ testLabel: label }),

  compareIds: [],
  toggleCompare: (id) =>
    set((state) => {
      if (state.compareIds.includes(id)) {
        return { compareIds: state.compareIds.filter((x) => x !== id) };
      }
      if (state.compareIds.length >= 2) {
        return { compareIds: [state.compareIds[1], id] };
      }
      return { compareIds: [...state.compareIds, id] };
    }),
  clearCompare: () => set({ compareIds: [] }),

  lightboxSrc: null,
  openLightbox: (src) => set({ lightboxSrc: src }),
  closeLightbox: () => set({ lightboxSrc: null }),
}));
