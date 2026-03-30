import { create } from "zustand";

export type ActiveView = "chat" | "library" | "templates" | "references";

type UIStore = {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  creatorStudioOpen: boolean;
  setCreatorStudioOpen: (open: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  activeView: "chat",
  setActiveView: (activeView) => set({ activeView }),
  creatorStudioOpen: false,
  setCreatorStudioOpen: (creatorStudioOpen) => set({ creatorStudioOpen }),
}));
