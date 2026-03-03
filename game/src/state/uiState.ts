// store/useColonyStore.ts
import { create } from "zustand";

interface UIState {
  // --- Core State ---
  inBuildingMode: boolean;
  buildingMode: "dig" | "place" | "none"

  setUIState: (newState: any) => void
}
export const useGameStore = create<UIState>((set, get) => ({
  // --- Initial State ---
  inBuildingMode: false,
  buildingMode: "none",

  setUIState: (newState: any) => {
    set(newState);
  },
}));
