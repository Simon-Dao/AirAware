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

  antTypes: AntType[];
  population: PopulationRecord[];

  foodAmount: number;

  airQuality: number;
  lastUpdate: number;

  // Index = hours since lastUpdate, value = average PM for that hour
  airQualityHistory: number[];

  loadGame: (username: string) => Promise<void>;
  saveGame: (username: string) => Promise<void>;
  fetchAirQualityHistory: (username: string) => Promise<void>;

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
  antTypes: [],
  username: "",

  foodAmount: 0,
  airQuality: 0,
  lastUpdate: Date.now(),
  airQualityHistory: [],

  loadGame: async (username: string) => {
    // await new Promise((resolve) => setTimeout(resolve, 4000));
    const res = await axios.get(SERVER_BASE_URL + "game/get/data", {
      params: { username },
    });

    const x = res.data.state;
    const colony = x.colony;

    await set({population: res.data.state.populations, antTypes:x.ant_types, foodAmount: colony.food_amount, airQuality: colony.air_quality, lastUpdate: colony.last_update});
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

  fetchAirQualityHistory: async (username: string) => {
    const { lastUpdate } = get();

    // lastUpdate may be Unix seconds (from server) or ms (from Date.now())
    const lastUpdateMs = lastUpdate > 1e12 ? lastUpdate : lastUpdate * 1000;
    const beginTime = new Date(lastUpdateMs);
    const endTime = new Date();

    const res = await axios.get(SERVER_BASE_URL + "user/get/data", {
      params: {
        username,
        begin_time: beginTime.toISOString().replace(/\.\d{3}Z$/, "Z"),
        end_time: endTime.toISOString().replace(/\.\d{3}Z$/, "Z"),
      },
    });

    const readings = res.data as { pm: number; timestamp: string }[];

    // Group readings into hourly buckets relative to lastUpdate
    const buckets = new Map<number, number[]>();
    const MS_PER_HOUR = 1000 * 60 * 60;

    for (const r of readings) {
      const elapsed = new Date(r.timestamp).getTime() - lastUpdateMs;
      if (elapsed < 0) continue;
      const hourIndex = Math.floor(elapsed / MS_PER_HOUR);
      if (!buckets.has(hourIndex)) buckets.set(hourIndex, []);
      buckets.get(hourIndex)!.push(r.pm);
    }

    if (buckets.size === 0) {
      set({ airQualityHistory: [] });
      return;
    }

    // Build a dense array from index 0 to the highest bucket
    const maxIndex = Math.max(...buckets.keys());
    const history = Array.from({ length: maxIndex + 1 }, (_, i) => {
      const vals = buckets.get(i);
      if (!vals || vals.length === 0) return -1; // -1 = no data for that hour
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    });

    set({ airQualityHistory: history });
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
    set({ lastUpdate: Math.floor(Date.now() / 1000) });
  },
}));
