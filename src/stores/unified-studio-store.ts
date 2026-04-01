import { create } from "zustand";
import type { ReferenceItem } from "@/types/reference";
import type { CarouselFormat } from "@/data/carousel-formats";
import type { ContentItem, ContentSetItem } from "@/types/content";

export type ContentType = "photo" | "carousel" | "video" | "talking-head";
export type VideoSource = "text" | "photo" | "motion";

export type SlideConfig = {
  position: number;
  sceneHint: string;
  outfitHint: string;
  moodHint: string;
  role: string;
  description: string;
  references: ReferenceItem[];
};

type UnifiedStudioStore = {
  // Output type
  contentType: ContentType;

  // Universal inputs
  prompt: string;
  attachedRefs: ReferenceItem[];
  inspirationPhotos: { base64: string; preview: string }[];
  inspirationVideo: { base64: string; preview: string } | null;

  // Photo config
  imageCount: number;

  // Carousel config
  selectedFormat: CarouselFormat | null;
  slides: SlideConfig[];
  slideCount: number;
  carouselInstructions: string;

  // Video config
  videoSource: VideoSource;
  videoDuration: 5 | 10;
  videoAspectRatio: "9:16" | "1:1" | "16:9";
  sourceContentId: string | null;

  // Talking head config
  script: string;
  voiceId: string;
  talkingSetting: string;
  talkingDuration: 15 | 30;

  // Generation state
  generating: boolean;
  generatingProgress: string;
  error: string | null;

  // Results
  showResults: boolean;
  results: ContentItem[];
  resultContentSet: ContentSetItem | null;

  // Actions
  setContentType: (type: ContentType) => void;
  setPrompt: (prompt: string) => void;
  attachRef: (ref: ReferenceItem) => void;
  detachRef: (refId: string) => void;
  addInspirationPhoto: (photo: { base64: string; preview: string }) => void;
  removeInspirationPhoto: (index: number) => void;
  setInspirationVideo: (video: { base64: string; preview: string } | null) => void;

  setImageCount: (count: number) => void;

  selectCarouselFormat: (format: CarouselFormat) => void;
  updateSlide: (position: number, updates: Partial<SlideConfig>) => void;
  attachSlideRef: (position: number, ref: ReferenceItem) => void;
  detachSlideRef: (position: number, refId: string) => void;
  setSlideCount: (count: number) => void;
  setCarouselInstructions: (instructions: string) => void;

  setVideoSource: (source: VideoSource) => void;
  setVideoDuration: (duration: 5 | 10) => void;
  setVideoAspectRatio: (ratio: "9:16" | "1:1" | "16:9") => void;
  setSourceContentId: (id: string | null) => void;

  setScript: (script: string) => void;
  setVoiceId: (voiceId: string) => void;
  setTalkingSetting: (setting: string) => void;
  setTalkingDuration: (duration: 15 | 30) => void;

  setGenerating: (generating: boolean) => void;
  setGeneratingProgress: (progress: string) => void;
  setError: (error: string | null) => void;

  setShowResults: (show: boolean) => void;
  setResults: (results: ContentItem[]) => void;
  setResultContentSet: (set: ContentSetItem | null) => void;

  reset: () => void;
};

const INITIAL: Omit<UnifiedStudioStore,
  'setContentType' | 'setPrompt' | 'attachRef' | 'detachRef' |
  'addInspirationPhoto' | 'removeInspirationPhoto' | 'setInspirationVideo' |
  'setImageCount' | 'selectCarouselFormat' | 'updateSlide' | 'attachSlideRef' |
  'detachSlideRef' | 'setSlideCount' | 'setCarouselInstructions' |
  'setVideoSource' | 'setVideoDuration' | 'setVideoAspectRatio' | 'setSourceContentId' |
  'setScript' | 'setVoiceId' | 'setTalkingSetting' | 'setTalkingDuration' |
  'setGenerating' | 'setGeneratingProgress' | 'setError' |
  'setShowResults' | 'setResults' | 'setResultContentSet' | 'reset'
> = {
  contentType: "photo",
  prompt: "",
  attachedRefs: [],
  inspirationPhotos: [],
  inspirationVideo: null,
  imageCount: 1,
  selectedFormat: null,
  slides: [],
  slideCount: 0,
  carouselInstructions: "",
  videoSource: "text",
  videoDuration: 5,
  videoAspectRatio: "9:16",
  sourceContentId: null,
  script: "",
  voiceId: "",
  talkingSetting: "",
  talkingDuration: 15,
  generating: false,
  generatingProgress: "",
  error: null,
  showResults: false,
  results: [],
  resultContentSet: null,
};

export const useUnifiedStudioStore = create<UnifiedStudioStore>((set) => ({
  ...INITIAL,

  setContentType: (contentType) => set({ contentType }),
  setPrompt: (prompt) => set({ prompt }),

  attachRef: (ref) => set((s) => ({
    attachedRefs: s.attachedRefs.some((r) => r.id === ref.id)
      ? s.attachedRefs.filter((r) => r.id !== ref.id) // toggle off
      : [...s.attachedRefs, ref], // toggle on
  })),
  detachRef: (refId) => set((s) => ({
    attachedRefs: s.attachedRefs.filter((r) => r.id !== refId),
  })),

  addInspirationPhoto: (photo) => set((s) => ({
    inspirationPhotos: [...s.inspirationPhotos, photo],
  })),
  removeInspirationPhoto: (index) => set((s) => ({
    inspirationPhotos: s.inspirationPhotos.filter((_, i) => i !== index),
  })),
  setInspirationVideo: (inspirationVideo) => set({ inspirationVideo }),

  setImageCount: (count) => set({ imageCount: Math.min(Math.max(count, 1), 4) }),

  selectCarouselFormat: (format) => {
    const count = format.slideRange[0];
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
      }));
    set({ selectedFormat: format, slides, slideCount: count });
  },

  updateSlide: (position, updates) => set((s) => ({
    slides: s.slides.map((sl) => sl.position === position ? { ...sl, ...updates } : sl),
  })),

  attachSlideRef: (position, ref) => set((s) => ({
    slides: s.slides.map((sl) =>
      sl.position === position
        ? { ...sl, references: [...sl.references.filter((r) => r.id !== ref.id), ref] }
        : sl
    ),
  })),

  detachSlideRef: (position, refId) => set((s) => ({
    slides: s.slides.map((sl) =>
      sl.position === position
        ? { ...sl, references: sl.references.filter((r) => r.id !== refId) }
        : sl
    ),
  })),

  setSlideCount: (count) => set((s) => {
    if (!s.selectedFormat) return {};
    const f = s.selectedFormat;
    const clamped = Math.min(Math.max(count, f.slideRange[0]), f.slideRange[1]);
    const slides = f.slides
      .filter((sl) => sl.required || sl.position <= clamped)
      .slice(0, clamped)
      .map((sl) => {
        const existing = s.slides.find((e) => e.position === sl.position);
        return existing ?? {
          position: sl.position, sceneHint: sl.sceneHint, outfitHint: sl.outfitHint,
          moodHint: sl.moodHint, role: sl.role, description: "", references: [],
        };
      });
    return { slideCount: clamped, slides };
  }),

  setCarouselInstructions: (carouselInstructions) => set({ carouselInstructions }),

  setVideoSource: (videoSource) => set({ videoSource }),
  setVideoDuration: (videoDuration) => set({ videoDuration }),
  setVideoAspectRatio: (videoAspectRatio) => set({ videoAspectRatio }),
  setSourceContentId: (sourceContentId) => set({ sourceContentId }),

  setScript: (script) => set({ script }),
  setVoiceId: (voiceId) => set({ voiceId }),
  setTalkingSetting: (talkingSetting) => set({ talkingSetting }),
  setTalkingDuration: (talkingDuration) => set({ talkingDuration }),

  setGenerating: (generating) => set({ generating }),
  setGeneratingProgress: (generatingProgress) => set({ generatingProgress }),
  setError: (error) => set({ error }),

  setShowResults: (showResults) => set({ showResults }),
  setResults: (results) => set({ results }),
  setResultContentSet: (resultContentSet) => set({ resultContentSet }),

  reset: () => set(INITIAL),
}));
