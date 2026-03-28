// src/stores/studio-store.ts
import { create } from "zustand";

export type StudioPhase =
  | "customize"
  | "generating"
  | "picking"
  | "finishing";

export type GenerationStep = "idle" | "base" | "uploading";

export type ReferenceMode = "exact" | "inspired";

export interface ReferenceImage {
  slot: "face" | "body" | "full";
  dataUrl: string; // base64 data URL for preview
  base64: string;  // raw base64 for API
  mimeType: string;
}

export interface StudioTraits {
  gender: string | null;
  age: string | null;
  ethnicity: string | null;
  build: string | null;
  chestSize: string | null;
  vibes: string[];
}

interface StudioState {
  phase: StudioPhase;
  traits: StudioTraits;
  description: string;
  referenceImages: ReferenceImage[];
  referenceMode: ReferenceMode;
  fineTuneOpen: boolean;
  generatedImages: string[];
  generatedKeys: string[];
  selectedImageIndex: number | null;
  creatorName: string;
  niche: string[];
  generationStep: GenerationStep;
  refineMode: boolean;
  refineText: string;
  isGenerating: boolean;
  error: string | null;
  // Actions
  setPhase: (phase: StudioPhase) => void;
  setGenerationStep: (step: GenerationStep) => void;
  setDescription: (description: string) => void;
  setReferenceMode: (mode: ReferenceMode) => void;
  setFineTuneOpen: (open: boolean) => void;
  addReferenceImage: (ref: ReferenceImage) => void;
  removeReferenceImage: (slot: "face" | "body" | "full") => void;
  pickTrait: (key: string, value: string | number) => void;
  toggleArrayTrait: (key: string, value: string) => void;
  setGeneratedImages: (images: string[], keys: string[]) => void;
  selectImage: (index: number) => void;
  setCreatorName: (name: string) => void;
  addNiche: (niche: string) => void;
  removeNiche: (niche: string) => void;
  setRefineMode: (v: boolean) => void;
  setRefineText: (text: string) => void;
  setIsGenerating: (v: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultTraits: StudioTraits = {
  gender: null,
  age: null,
  ethnicity: null,
  build: null,
  chestSize: null,
  vibes: [],
};

export const useStudioStore = create<StudioState>((set) => ({
  phase: "customize",
  traits: { ...defaultTraits },
  description: "",
  referenceImages: [],
  referenceMode: "exact",
  fineTuneOpen: false,
  generatedImages: [],
  generatedKeys: [],
  selectedImageIndex: null,
  creatorName: "",
  niche: [],
  generationStep: "idle",
  refineMode: false,
  refineText: "",
  isGenerating: false,
  error: null,

  setPhase: (phase) => set({ phase }),
  setGenerationStep: (generationStep) => set({ generationStep }),
  setDescription: (description) => set({ description }),
  setReferenceMode: (referenceMode) => set({ referenceMode }),
  setFineTuneOpen: (fineTuneOpen) => set({ fineTuneOpen }),

  addReferenceImage: (ref) =>
    set((state) => ({
      referenceImages: [
        ...state.referenceImages.filter((r) => r.slot !== ref.slot),
        ref,
      ],
    })),

  removeReferenceImage: (slot) =>
    set((state) => ({
      referenceImages: state.referenceImages.filter((r) => r.slot !== slot),
    })),

  pickTrait: (key, value) =>
    set((state) => ({
      traits: { ...state.traits, [key]: value },
    })),

  toggleArrayTrait: (key, value) =>
    set((state) => {
      const current = state.traits[key as keyof StudioTraits];
      if (!Array.isArray(current)) return state;
      const arr = current as string[];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { traits: { ...state.traits, [key]: next } };
    }),

  setGeneratedImages: (generatedImages, generatedKeys) =>
    set({ generatedImages, generatedKeys, phase: "picking", isGenerating: false }),

  selectImage: (index) => set({ selectedImageIndex: index }),

  setRefineMode: (refineMode) => set({ refineMode, refineText: "" }),
  setRefineText: (refineText) => set({ refineText }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error }),

  setCreatorName: (creatorName) => set({ creatorName }),

  addNiche: (niche) =>
    set((state) => ({
      niche: state.niche.includes(niche)
        ? state.niche
        : [...state.niche, niche],
    })),

  removeNiche: (niche) =>
    set((state) => ({
      niche: state.niche.filter((n) => n !== niche),
    })),

  reset: () =>
    set({
      phase: "customize",
      traits: { ...defaultTraits },
      description: "",
      referenceImages: [],
      referenceMode: "exact",
      fineTuneOpen: false,
      generatedImages: [],
      generatedKeys: [],
      selectedImageIndex: null,
      creatorName: "",
      niche: [],
      generationStep: "idle",
      refineMode: false,
      refineText: "",
      isGenerating: false,
      error: null,
    }),
}));
