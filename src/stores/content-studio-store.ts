import { create } from "zustand";
import type { ReferenceItem } from "@/types/reference";
import type { CarouselFormat } from "@/data/carousel-formats";

export type ContentStudioStep = "library" | "builder" | "review";

export type SlideConfig = {
  position: number;
  sceneHint: string;
  outfitHint: string;
  moodHint: string;
  role: string;
  description: string;
  references: ReferenceItem[];
  autoMatched: boolean;
};

export type StudioMode = "carousel" | "single" | "freeform";

type ContentStudioStore = {
  step: ContentStudioStep;
  mode: StudioMode;
  selectedFormat: CarouselFormat | null;
  slides: SlideConfig[];
  slideCount: number;
  globalInstructions: string;
  sourceContentId: string | null;
  freeformPrompt: string;
  imageCount: number;
  generating: boolean;
  error: string | null;

  setStep: (step: ContentStudioStep) => void;
  selectFormat: (format: CarouselFormat, slideCount?: number) => void;
  startFreeform: (prompt?: string) => void;
  startSingleTemplate: (name: string, scenePrompt: string) => void;
  setSlides: (slides: SlideConfig[]) => void;
  updateSlide: (position: number, updates: Partial<SlideConfig>) => void;
  attachRef: (position: number, ref: ReferenceItem) => void;
  detachRef: (position: number, refId: string) => void;
  setSlideCount: (count: number) => void;
  setGlobalInstructions: (instructions: string) => void;
  setFreeformPrompt: (prompt: string) => void;
  setImageCount: (count: number) => void;
  setSourceContentId: (id: string | null) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  autoMatchReferences: (references: ReferenceItem[]) => void;
};

const INITIAL_STATE = {
  step: "library" as ContentStudioStep,
  mode: "carousel" as StudioMode,
  selectedFormat: null as CarouselFormat | null,
  slides: [] as SlideConfig[],
  slideCount: 0,
  globalInstructions: "",
  sourceContentId: null as string | null,
  freeformPrompt: "",
  imageCount: 1,
  generating: false,
  error: null as string | null,
};

export const useContentStudioStore = create<ContentStudioStore>((set) => ({
  ...INITIAL_STATE,

  setStep: (step) => set({ step }),

  selectFormat: (format, slideCount) => {
    const count = slideCount ?? format.slideRange[0];
    const slides = format.slides
      .filter((s) => s.required || s.position <= count)
      .slice(0, count)
      .map((s) => ({
        position: s.position,
        sceneHint: s.sceneHint,
        outfitHint: s.outfitHint,
        moodHint: s.moodHint,
        role: s.role,
        description: "",
        references: [],
        autoMatched: false,
      }));
    set({ selectedFormat: format, mode: "carousel", slides, slideCount: count, step: "builder" });
  },

  startFreeform: (prompt) => {
    const slide: SlideConfig = {
      position: 1,
      sceneHint: "custom",
      outfitHint: "",
      moodHint: "",
      role: "content",
      description: prompt ?? "",
      references: [],
      autoMatched: false,
    };
    set({
      mode: "freeform",
      selectedFormat: null,
      slides: [slide],
      slideCount: 1,
      freeformPrompt: prompt ?? "",
      step: "builder",
    });
  },

  startSingleTemplate: (name, scenePrompt) => {
    const slide: SlideConfig = {
      position: 1,
      sceneHint: name.toLowerCase().replace(/\s+/g, "-"),
      outfitHint: "",
      moodHint: scenePrompt,
      role: "content",
      description: "",
      references: [],
      autoMatched: false,
    };
    set({
      mode: "single",
      selectedFormat: null,
      slides: [slide],
      slideCount: 1,
      step: "builder",
    });
  },

  setSlides: (slides) => set({ slides }),

  updateSlide: (position, updates) =>
    set((state) => ({
      slides: state.slides.map((s) =>
        s.position === position ? { ...s, ...updates } : s
      ),
    })),

  attachRef: (position, ref) =>
    set((state) => ({
      slides: state.slides.map((s) =>
        s.position === position
          ? { ...s, references: [...s.references.filter((r) => r.id !== ref.id), ref], autoMatched: false }
          : s
      ),
    })),

  detachRef: (position, refId) =>
    set((state) => ({
      slides: state.slides.map((s) =>
        s.position === position
          ? { ...s, references: s.references.filter((r) => r.id !== refId) }
          : s
      ),
    })),

  setSlideCount: (count) =>
    set((state) => {
      if (!state.selectedFormat) return {};
      const format = state.selectedFormat;
      const clamped = Math.min(Math.max(count, format.slideRange[0]), format.slideRange[1]);
      const slides = format.slides
        .filter((s) => s.required || s.position <= clamped)
        .slice(0, clamped)
        .map((s) => {
          const existing = state.slides.find((e) => e.position === s.position);
          return existing ?? {
            position: s.position,
            sceneHint: s.sceneHint,
            outfitHint: s.outfitHint,
            moodHint: s.moodHint,
            role: s.role,
            description: "",
            references: [],
            autoMatched: false,
          };
        });
      return { slideCount: clamped, slides };
    }),

  setGlobalInstructions: (globalInstructions) => set({ globalInstructions }),
  setFreeformPrompt: (freeformPrompt) => set({ freeformPrompt }),
  setImageCount: (count) => set({ imageCount: Math.min(Math.max(count, 1), 4) }),
  setSourceContentId: (sourceContentId) => set({ sourceContentId }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  reset: () => set(INITIAL_STATE),

  autoMatchReferences: (references) =>
    set((state) => {
      const newSlides = state.slides.map((slide) => {
        if (slide.references.length > 0) return slide; // Don't override manual refs

        const sceneKeywords = slide.sceneHint.split("-").map((k) => k.toLowerCase());
        const matched: ReferenceItem[] = [];

        for (const ref of references) {
          const tagOverlap = ref.tags.some((tag) =>
            sceneKeywords.some((kw) => tag.includes(kw) || kw.includes(tag))
          );
          if (tagOverlap && !matched.some((m) => m.type === ref.type)) {
            matched.push(ref);
          }
        }

        if (matched.length > 0) {
          return { ...slide, references: matched, autoMatched: true };
        }
        return slide;
      });
      return { slides: newSlides };
    }),
}));
