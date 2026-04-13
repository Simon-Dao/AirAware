// store/useColonyStore.ts
import axios from "axios";
import { create } from "zustand";
import {
  SERVER_BASE_URL, TILE_COMPLETION_MS,
  GROWTH_RATE_PER_SECOND, DECAY_RATE_PER_SECOND, SEVERE_DECAY_RATE_PER_SECOND,
  STARVATION_RATE_PER_SECOND, MIN_TOTAL_POPULATION, MAX_CATCHUP_SECONDS,
} from "./constants";

// Fills -1 gaps in hourly AQ history via linear interpolation.
// Leading gaps use the first known value; trailing gaps use the last known value.
export function interpolateAQHistory(history: number[]): number[] {
  const result = [...history];
  const known: number[] = [];

  for (let i = 0; i < result.length; i++) {
    if (result[i] !== -1) known.push(i);
  }

  if (known.length === 0) return result;

  for (let i = 0; i < known[0]; i++) result[i] = result[known[0]];
  for (let i = known[known.length - 1] + 1; i < result.length; i++)
    result[i] = result[known[known.length - 1]];

  for (let k = 0; k < known.length - 1; k++) {
    const lo = known[k], hi = known[k + 1];
    for (let i = lo + 1; i < hi; i++) {
      const t = (i - lo) / (hi - lo);
      result[i] = result[lo] + t * (result[hi] - result[lo]);
    }
  }

  return result;
}

type Tile = {
  type: "none" | "tunnel" | "nesting_chamber" | "food_store";
  completion: number | null; // Unix ms timestamp when action completes, null if already complete
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
  digTunnel: (row: number, col: number) => void;
  fillTunnel: (row: number, col: number) => void;
  cancelTile: (row: number, col: number) => void;
  completePendingTiles: () => void;
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
    const map = colony.map ? JSON.parse(colony.map) : {};

    set({ map, population: res.data.state.populations, antTypes: x.ant_types, foodAmount: colony.food_amount, airQuality: colony.air_quality, lastUpdate: colony.last_update });

    const lastUpdateMs = colony.last_update > 1e12 ? colony.last_update : colony.last_update * 1000;
    const elapsedSeconds = Math.min((Date.now() - lastUpdateMs) / 1000, MAX_CATCHUP_SECONDS);
    if (elapsedSeconds > 0) get().tick(elapsedSeconds);
  },

  saveGame: async (username: string) => {
    const { map, population, foodAmount, airQuality, lastUpdate } = get();

    const resp = await axios.post(SERVER_BASE_URL + "game/save/data", {
      username,
      map: JSON.stringify(map),
      population,
      foodAmount,
      airQuality,
      lastUpdate: Date.now(),
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

  digTunnel: (row: number, col: number) => {
    set((state) => {
      const existing = state.map[row]?.[col];
      if (existing?.type === "tunnel") return {};
      return {
        map: {
          ...state.map,
          [row]: { ...state.map[row], [col]: { type: "tunnel", completion: Date.now() + TILE_COMPLETION_MS } },
        },
      };
    });
  },

  fillTunnel: (row: number, col: number) => {
    set((state) => {
      const existing = state.map[row]?.[col];
      if (!existing) return {};
      return {
        map: {
          ...state.map,
          [row]: { ...state.map[row], [col]: { type: "none", completion: Date.now() + TILE_COMPLETION_MS } },
        },
      };
    });
  },

  cancelTile: (row: number, col: number) => {
    set((state) => {
      const tile = state.map[row]?.[col];
      if (!tile || tile.completion === null) return {};

      const newRow = { ...state.map[row] };
      if (tile.type === "tunnel") {
        // Was digging — remove tile back to dirt
        delete newRow[col];
      } else {
        // Was filling — restore to completed tunnel
        newRow[col] = { type: "tunnel", completion: null };
      }

      const newMap = { ...state.map, [row]: newRow };
      if (Object.keys(newRow).length === 0) delete newMap[row];
      return { map: newMap };
    });
  },

  completePendingTiles: () => {
    const now = Date.now();
    set((state) => {
      let changed = false;
      const newMap = { ...state.map };

      for (const rowKey of Object.keys(newMap)) {
        const row = Number(rowKey);
        const newRow = { ...newMap[row] };
        let rowChanged = false;

        for (const colKey of Object.keys(newRow)) {
          const col = Number(colKey);
          const tile = newRow[col];
          if (tile.completion !== null && tile.completion <= now) {
            changed = true;
            rowChanged = true;
            if (tile.type === "none") {
              delete newRow[col];
            } else {
              newRow[col] = { ...tile, completion: null };
            }
          }
        }

        if (rowChanged) {
          newMap[row] = newRow;
          if (Object.keys(newRow).length === 0) delete newMap[row];
        }
      }

      return changed ? { map: newMap } : {};
    });
  },

  setAirQuality: (aqi: number) => {
    set({ airQuality: aqi });
  },

  tick: (deltaSeconds: number) => {
    const state = get();
    if (state.population.length === 0) return;

    const foragingRate = get().getForagingRate();
    const hungerRate = get().getHungerRate();
    const newFood = Math.max(0, state.foodAmount + (foragingRate - hungerRate) * deltaSeconds);
    const isStarving = newFood === 0;

    const pm = state.airQuality;
    let rate = pm <= 20    ? GROWTH_RATE_PER_SECOND
             : pm <= 35.4  ? 0
             : pm <= 150.4 ? -DECAY_RATE_PER_SECOND
                           : -SEVERE_DECAY_RATE_PER_SECOND;
    if (isStarving) rate -= STARVATION_RATE_PER_SECOND;

    const factor = 1 + rate * deltaSeconds;
    let newPop = state.population.map(r => ({ ...r, population: r.population * factor }));
    const total = newPop.reduce((s, r) => s + r.population, 0);

    if (total <= 0) {
      newPop = state.population.map(r => ({ ...r, population: MIN_TOTAL_POPULATION / state.population.length }));
    } else if (total < MIN_TOTAL_POPULATION) {
      const scale = MIN_TOTAL_POPULATION / total;
      newPop = newPop.map(r => ({ ...r, population: r.population * scale }));
    }

    set({ foodAmount: newFood, population: newPop });
  },

  getAttackRate: () => get().population.reduce((s, r) => s + r.population * r.antType.attack, 0),
  getMiningRate: () => get().population.reduce((s, r) => s + r.population * r.antType.mining, 0),
  getForagingRate: () => get().population.reduce((s, r) => s + r.population * r.antType.foraging, 0),
  getHungerRate: () => get().population.reduce((s, r) => s + r.population * r.antType.hunger_cost, 0),
  getTotalPopulation: () => get().population.reduce((s, r) => s + r.population, 0),

  saveTimestamp: () => {
    set({ lastUpdate: Math.floor(Date.now() / 1000) });
  },
}));
