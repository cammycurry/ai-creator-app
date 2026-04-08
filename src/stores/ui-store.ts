import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ActiveView = "chat" | "library";

type UIStore = {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  creatorStudioOpen: boolean;
  setCreatorStudioOpen: (open: boolean) => void;
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      activeView: "chat",
      setActiveView: (activeView) => set({ activeView }),
      creatorStudioOpen: false,
      setCreatorStudioOpen: (creatorStudioOpen) => set({ creatorStudioOpen }),
    }),
    {
      name: "ui-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: () => ({}),
    }
  )
);
