import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ActiveView = "chat" | "library" | "templates";

type UIStore = {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  creatorStudioOpen: boolean;
  setCreatorStudioOpen: (open: boolean) => void;
  contentStudioOpen: boolean;
  setContentStudioOpen: (open: boolean) => void;
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      activeView: "chat",
      setActiveView: (activeView) => set({ activeView }),
      creatorStudioOpen: false,
      setCreatorStudioOpen: (creatorStudioOpen) => set({ creatorStudioOpen }),
      contentStudioOpen: false,
      setContentStudioOpen: (contentStudioOpen) => set({ contentStudioOpen }),
    }),
    {
      name: "ui-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        contentStudioOpen: state.contentStudioOpen,
      }),
    }
  )
);
