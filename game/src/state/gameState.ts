// store/useColonyStore.ts
import { create } from "zustand";

type Tile = {
  type: "none" | "tunnel" | "nesting_chamber" | "food_store";
  completion: Date | null;
};

interface GameState {
  // --- Core State ---
  map: Tile[][];

  population: number;
  diggers: number;
  foragers: number;

  food: number;
  tunnelSize: number;
  efficiency: number;

  airQuality: number;
  lastUpdate: number;

  initialize: () => Promise<void>;

  // --- Actions ---
  setState: (newState: any) => void;
  setAirQuality: (aqi: number) => void;
  allocateWorkers: (diggers: number, foragers: number) => void;
  tick: (deltaSeconds: number) => void;
  saveTimestamp: () => void;
}

export async function getGameState(): Promise<GameState> {
  const res = await fetch("/api/game-state");

  if (!res.ok) {
    throw new Error("Failed to fetch game state");
  }

  return res.json();
}

function initialMapState() {
  let tempMap = [];

  for (let i = 0; i < 66; i++) {
    let row: Tile[] = [];
    for (let j = 0; j < 100; j++) {
      let tile: Tile = {
        type: "none",
        completion: null,
      };

      row.push(tile);
    }
    tempMap.push(row);
  }

  tempMap[0][0].type = "tunnel";
  tempMap[0][1].type = "tunnel";

  return tempMap;
}

export const useGameStore = create<GameState>((set, get) => ({
  // --- Initial State ---
  map: initialMapState(),
  population: 20,
  diggers: 10,
  foragers: 10,

  food: 100,
  tunnelSize: 50,
  efficiency: 1,

  airQuality: 75,
  lastUpdate: Date.now(),

  initialize: async () => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    // await set({ map: tempMap });
  },

  // --- Actions ---
  setState: (newState: any) => {
    set(newState);
  },

  setAirQuality: (aqi: number) => {
    set({ airQuality: aqi });
  },

  allocateWorkers: (diggers: number, foragers: number) => {
    const { population } = get();

    if (diggers + foragers <= population) {
      set({ diggers, foragers });
    }
  },

  tick: (deltaSeconds: number) => {
    const state = get();

    const airModifier = state.airQuality > 70 ? 1.2 : 0.8;

    const digRate = state.diggers * 0.3 * airModifier * state.efficiency;

    const foodRate = state.foragers * 0.4 * airModifier * state.efficiency;

    const newFood =
      state.food +
      foodRate * deltaSeconds -
      state.population * 0.1 * deltaSeconds;

    const newTunnel = state.tunnelSize + digRate * deltaSeconds;

    let newPopulation = state.population;

    if (newFood > 150) {
      newPopulation += 0.05 * deltaSeconds;
    }

    if (newFood < 0) {
      newPopulation -= 0.05 * deltaSeconds;
    }

    set({
      food: Math.max(0, newFood),
      tunnelSize: newTunnel,
      population: Math.max(1, newPopulation),
    });
  },

  saveTimestamp: () => {
    set({ lastUpdate: Date.now() });
  },
}));
