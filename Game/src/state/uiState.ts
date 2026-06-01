// store/useColonyStore.ts
import { create } from "zustand";

export type SelectedAction = "dig" | "fill" | "nest" | "none";

interface UIState {
  // --- Core State ---
  buildingMode: "dig" | "place" | "none";
  selectedAction: SelectedAction;

  setUIState: (newState: any) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  // --- Initial State ---
  buildingMode: "none",
  selectedAction: "none",

  setUIState: (newState: any) => {
    set(newState);
  },
}));
