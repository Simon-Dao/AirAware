// store/useColonyStore.ts
import axios from "axios";
import { create } from "zustand";
import { SERVER_BASE_URL } from "./constants";

type Tile = {
  type: "none" | "tunnel" | "nesting_chamber" | "food_store";
  completion: Date | null;
};

type AntType = {
  name: string;
  foraging: number;
  mining: number;
  hunger_cost: number;
  attack: number;
};

type PopulationRecord = {
  antType: AntType;
  population: number;
};

interface GameState {
  // --- Core State ---

  //basically a more space efficient 2d array
  map: Record<number, Record<number, Tile>>;
  
  username: string;
  population: PopulationRecord[];

  foodAmount: number;

  airQuality: number;
  lastUpdate: number;

  loadGame: (username: string) => Promise<void>;
  saveGame: (username: string) => Promise<void>;

  // --- Actions ---
  setAirQuality: (aqi: number) => void;
  getAttackRate: () => number;
  getMiningRate: () => number;
  getForagingRate: () => number;
  getHungerRate: () => number;
  getTotalPopulation: () => number;
  tick: (deltaSeconds: number) => void;
  saveTimestamp: () => void;
}

function initialMapState() {
  return {} as Record<number, Record<number, Tile>>;
}

export const useGameStore = create<GameState>((set, get) => ({
  // --- Initial State ---
  map: initialMapState(),
  population: [],
  username: "",

  foodAmount: 0,
  airQuality: 0,
  lastUpdate: Date.now(),

  loadGame: async (username: string) => {
    // await new Promise((resolve) => setTimeout(resolve, 4000));
    const res = await axios.get(SERVER_BASE_URL + "game/get/data", {
      params: { username },
    });

    const x = res.data.state;
    const colony = x.colony;

    await set({population: x.ant_types, foodAmount:colony.foodAmount, airQuality: colony.airQuality, lastUpdate: colony.last_update});
  },

  saveGame: async (username: string) => {
    const { map, population, foodAmount, airQuality, lastUpdate } = get();

    const resp = await axios.post(SERVER_BASE_URL + "game/save/data", {
      username,
      map: JSON.stringify(map),
      population,
      foodAmount,
      airQuality,
      lastUpdate,
    });

    console.log(resp)
  },

  // --- Actions ---

  setAirQuality: (aqi: number) => {
    set({ airQuality: aqi });
  },

  tick: (deltaSeconds: number) => {
    set({});
  },

  getAttackRate: () => {
    return 0;
  },
  getMiningRate: () => {
    return 0;
  },
  getForagingRate: () => {
    return 0;
  },
  getHungerRate: () => {
    return 0;
  },

  getTotalPopulation: () => {
    return 0;
  },

  saveTimestamp: () => {
    set({ lastUpdate: Date.now() });
  },
}));
