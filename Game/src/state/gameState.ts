// store/useColonyStore.ts
import axios from "axios";
import { create } from "zustand";
import {
  SERVER_BASE_URL, TILE_COMPLETION_MS,
  NATURAL_DECAY_RATE_PER_SECOND, DECAY_RATE_PER_SECOND, SEVERE_DECAY_RATE_PER_SECOND,
  STARVATION_RATE_PER_SECOND, MIN_TOTAL_POPULATION, MAX_CATCHUP_SECONDS,
  HATCH_RATE_BASE, CAPACITY_PER_CHAMBER, DIG_FOOD_COST, FILL_FOOD_COST, NEST_FOOD_COST, EGG_FOOD_COST,
  aqForagingMultiplier,
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
  antTypeId?: number;        // only set for nesting_chamber tiles
};

export type AntType = {
  id: number;
  name: string;
  foraging: number;
  mining: number;
  hunger_cost: number;
  attack: number;
  unlock_cost: number;
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
  unlockedAntTypeIds: number[];

  // antTypeId → fractional egg count
  eggInventory: Record<number, number>;

  foodAmount: number;

  airQuality: number;
  lastUpdate: number;

  // Index = hours since lastUpdate, value = average PM for that hour
  airQualityHistory: number[];

  loadGame: (username: string) => Promise<void>;
  saveGame: (username: string) => Promise<void>;
  fetchAirQualityHistory: (username: string) => Promise<void>;
  pollAirQuality: (username: string) => Promise<void>;
  unlockAntType: (username: string, antTypeId: number) => Promise<{ success: boolean; message: string }>;

  // --- Actions ---
  digTunnel: (row: number, col: number) => void;
  fillTunnel: (row: number, col: number) => void;
  convertToNestingChamber: (row: number, col: number, antTypeId: number) => void;
  cancelTile: (row: number, col: number) => void;
  completePendingTiles: () => void;
  setAirQuality: (aqi: number) => void;
  recruitAnts: (antTypeId: number, count: number) => void;
  getAttackRate: () => number;
  getMiningRate: () => number;
  getForagingRate: () => number;
  getHungerRate: () => number;
  getTotalPopulation: () => number;
  getHousingCapacity: () => number;
  getPopulationRatePerHour: () => number;
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
  unlockedAntTypeIds: [],
  eggInventory: {},
  username: "",

  foodAmount: 0,
  airQuality: 0,
  lastUpdate: Date.now(),
  airQualityHistory: [],

  loadGame: async (username: string) => {
    const res = await axios.get(SERVER_BASE_URL + "game/get/data", {
      params: { username },
    });

    const x = res.data.state;
    const colony = x.colony;
    const map = colony.map ? JSON.parse(colony.map) : {};

    const population = res.data.state.populations.map((p: { ant_type_id: number; population: number }) => ({
      population: p.population,
      antType: x.ant_types.find((at: AntType & { id: number }) => at.id === p.ant_type_id),
    }));

    // egg_inventory comes back as {ant_type_id: count}, keys may be strings
    const rawEggs = x.egg_inventory ?? {};
    const eggInventory: Record<number, number> = {};
    for (const [k, v] of Object.entries(rawEggs)) {
      eggInventory[Number(k)] = v as number;
    }

    set({
      map,
      population,
      antTypes: x.ant_types,
      unlockedAntTypeIds: x.unlocked_ant_type_ids ?? [],
      eggInventory,
      foodAmount: colony.food_amount,
      airQuality: colony.air_quality,
      lastUpdate: colony.last_update,
    });

    const lastUpdateMs = colony.last_update > 1e12 ? colony.last_update : colony.last_update * 1000;
    const elapsedSeconds = Math.min((Date.now() - lastUpdateMs) / 1000, MAX_CATCHUP_SECONDS);
    if (elapsedSeconds > 0) get().tick(elapsedSeconds);

    // Override the stale colony.air_quality with fresh sensor data immediately.
    await get().pollAirQuality(username);
  },

  saveGame: async (username: string) => {
    const { map, population, foodAmount, airQuality, eggInventory } = get();

    const resp = await axios.post(SERVER_BASE_URL + "game/save/data", {
      username,
      map: JSON.stringify(map),
      population,
      foodAmount,
      airQuality,
      eggInventory,
      lastUpdate: Date.now(),
    });

    console.log(resp);
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
      if (state.foodAmount < DIG_FOOD_COST) return {};
      return {
        foodAmount: state.foodAmount - DIG_FOOD_COST,
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
      if (state.foodAmount < FILL_FOOD_COST) return {};
      return {
        foodAmount: state.foodAmount - FILL_FOOD_COST,
        map: {
          ...state.map,
          [row]: { ...state.map[row], [col]: { type: "none", completion: Date.now() + TILE_COMPLETION_MS } },
        },
      };
    });
  },

  convertToNestingChamber: (row: number, col: number, antTypeId: number) => {
    set((state) => {
      const tile = state.map[row]?.[col];
      if (!tile || tile.type !== "tunnel" || tile.completion !== null) return {};
      if (state.foodAmount < NEST_FOOD_COST) return {};
      return {
        foodAmount: state.foodAmount - NEST_FOOD_COST,
        map: {
          ...state.map,
          [row]: {
            ...state.map[row],
            [col]: { type: "nesting_chamber", completion: Date.now() + TILE_COMPLETION_MS, antTypeId },
          },
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
      } else if (tile.type === "nesting_chamber") {
        // Was converting — restore to completed tunnel
        newRow[col] = { type: "tunnel", completion: null };
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

  pollAirQuality: async (username: string) => {
    const RECENT_N = 10;
    const now = new Date();
    // Try last hour first, then fall back to last 30 days so old-timestamped
    // seed/dev readings still take effect.
    const windows = [60 * 60 * 1000, 30 * 24 * 60 * 60 * 1000];

    for (const windowMs of windows) {
      const begin = new Date(now.getTime() - windowMs);
      const res = await axios.get(SERVER_BASE_URL + "user/get/readings", {
        params: {
          username,
          begin_time: begin.toISOString().replace(/\.\d{3}Z$/, "Z"),
          end_time:   now.toISOString().replace(/\.\d{3}Z$/, "Z"),
        },
      });
      const readings = res.data.readings as { pm: number; timestamp: string }[];
      if (readings.length > 0) {
        const recent = [...readings]
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, RECENT_N);
        const avg = recent.reduce((sum, r) => sum + r.pm, 0) / recent.length;
        set({ airQuality: avg });
        return;
      }
    }
  },

  tick: (deltaSeconds: number) => {
    const state = get();
    if (state.population.length === 0) return;

    // --- Food & population decay ---
    const foragingRate = get().getForagingRate();
    const hungerRate = get().getHungerRate();
    const newFood = Math.max(0, state.foodAmount + (foragingRate - hungerRate) * deltaSeconds);
    const isStarving = newFood === 0;

    const pm = state.airQuality;
    let rate = -NATURAL_DECAY_RATE_PER_SECOND;
    if (pm > 20 && pm <= 150.4) rate -= DECAY_RATE_PER_SECOND;
    else if (pm > 150.4)        rate -= SEVERE_DECAY_RATE_PER_SECOND;
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

    // --- Egg hatching from nesting chambers ---
    const hatchMultiplier =
      pm <= 20    ? 1.0 :
      pm <= 35.4  ? 0.7 :
      pm <= 55.4  ? 0.5 :
      pm <= 150.4 ? 0.3 : 0.1;

    // Count active (completed) nesting_chamber tiles grouped by antTypeId
    const chambersByType: Record<number, number> = {};
    let totalChambers = 0;
    for (const rowTiles of Object.values(state.map)) {
      for (const tile of Object.values(rowTiles)) {
        if (tile.type === "nesting_chamber" && tile.completion === null && tile.antTypeId !== undefined) {
          chambersByType[tile.antTypeId] = (chambersByType[tile.antTypeId] ?? 0) + 1;
          totalChambers++;
        }
      }
    }

    // Hatching is gated per-type: each type can only hatch up to its own chambers' capacity.
    const newEggs = { ...state.eggInventory };
    const eggHatches: Record<number, number> = {};

    for (const [antTypeIdStr, chamberCount] of Object.entries(chambersByType)) {
      const antTypeId = Number(antTypeIdStr);
      const available = newEggs[antTypeId] ?? 0;
      if (available <= 0) continue;
      const typeCapacity = chamberCount * CAPACITY_PER_CHAMBER;
      const typePop = newPop.find(r => r.antType.id === antTypeId)?.population ?? 0;
      const typeAvailable = Math.max(0, typeCapacity - typePop);
      if (typeAvailable <= 0) continue;
      const maxHatch = Math.min(available, typeAvailable, HATCH_RATE_BASE * hatchMultiplier * chamberCount * deltaSeconds);
      newEggs[antTypeId] = available - maxHatch;
      eggHatches[antTypeId] = maxHatch;
    }

    // Add hatched ants to population, creating a record if the type isn't there yet
    for (const [antTypeIdStr, hatched] of Object.entries(eggHatches)) {
      const antTypeId = Number(antTypeIdStr);
      const existing = newPop.find(r => r.antType.id === antTypeId);
      if (existing) {
        newPop = newPop.map(r => r.antType.id === antTypeId ? { ...r, population: r.population + hatched } : r);
      } else {
        const antType = state.antTypes.find(at => at.id === antTypeId);
        if (antType) newPop = [...newPop, { antType, population: hatched }];
      }
    }

    set({ foodAmount: newFood, population: newPop, eggInventory: newEggs });
  },

  unlockAntType: async (username: string, antTypeId: number) => {
    const res = await axios.post(SERVER_BASE_URL + "game/unlock/ant_type", { username, ant_type_id: antTypeId });
    const { success, message } = res.data;
    if (success) {
      // Sync food from server (deduction happened server-side)
      const gameRes = await axios.get(SERVER_BASE_URL + "game/get/data", { params: { username } });
      const colony = gameRes.data.state.colony;
      set((state) => ({
        foodAmount: colony.food_amount,
        unlockedAntTypeIds: [...state.unlockedAntTypeIds, antTypeId],
      }));
    }
    return { success, message };
  },

  recruitAnts: (antTypeId: number, count: number) => {
    const { antTypes, foodAmount, eggInventory } = get();
    const antType = antTypes.find((at) => at.id === antTypeId);
    if (!antType || count <= 0) return;

    const totalCost = count * EGG_FOOD_COST;
    if (foodAmount < totalCost) return;

    set({
      foodAmount: foodAmount - totalCost,
      eggInventory: {
        ...eggInventory,
        [antTypeId]: (eggInventory[antTypeId] ?? 0) + count,
      },
    });
  },

  getAttackRate: () => get().population.reduce((s, r) => s + r.population * r.antType.attack, 0),
  getMiningRate: () => get().population.reduce((s, r) => s + r.population * r.antType.mining, 0),
  getForagingRate: () => {
    const { population, airQuality } = get();
    const mult = aqForagingMultiplier(airQuality);
    return population.reduce((s, r) => s + r.population * r.antType.foraging, 0) * mult;
  },
  getHungerRate: () => get().population.reduce((s, r) => s + r.population * r.antType.hunger_cost, 0),
  getTotalPopulation: () => get().population.reduce((s, r) => s + r.population, 0),
  getHousingCapacity: () => {
    let count = 0;
    for (const rowTiles of Object.values(get().map)) {
      for (const tile of Object.values(rowTiles)) {
        if (tile.type === "nesting_chamber" && tile.completion === null) count++;
      }
    }
    return count * CAPACITY_PER_CHAMBER;
  },

  getPopulationRatePerHour: () => {
    const { map, population, airQuality, foodAmount, eggInventory } = get();
    const pm = airQuality;

    // Decay contribution
    let decayRate = NATURAL_DECAY_RATE_PER_SECOND;
    if (pm > 20 && pm <= 150.4) decayRate += DECAY_RATE_PER_SECOND;
    else if (pm > 150.4)        decayRate += SEVERE_DECAY_RATE_PER_SECOND;
    const foragingRate = get().getForagingRate();
    const hungerRate = get().getHungerRate();
    if (foodAmount === 0 && hungerRate > foragingRate) decayRate += STARVATION_RATE_PER_SECOND;
    const totalPop = population.reduce((s, r) => s + r.population, 0);
    const decayPerHour = totalPop * decayRate * 3600;

    // Hatch contribution
    const hatchMultiplier =
      pm <= 20    ? 1.0 :
      pm <= 35.4  ? 0.7 :
      pm <= 55.4  ? 0.5 :
      pm <= 150.4 ? 0.3 : 0.1;

    const chambersByType: Record<number, number> = {};
    let totalChambers = 0;
    for (const rowTiles of Object.values(map)) {
      for (const tile of Object.values(rowTiles)) {
        if (tile.type === "nesting_chamber" && tile.completion === null && tile.antTypeId !== undefined) {
          chambersByType[tile.antTypeId] = (chambersByType[tile.antTypeId] ?? 0) + 1;
          totalChambers++;
        }
      }
    }

    let hatchPerHour = 0;
    for (const [antTypeIdStr, chamberCount] of Object.entries(chambersByType)) {
      const antTypeId = Number(antTypeIdStr);
      if ((eggInventory[antTypeId] ?? 0) <= 0) continue;
      const typeCapacity = chamberCount * CAPACITY_PER_CHAMBER;
      const typePop = population.find(r => r.antType.id === antTypeId)?.population ?? 0;
      if (typePop < typeCapacity) {
        hatchPerHour += HATCH_RATE_BASE * hatchMultiplier * chamberCount * 3600;
      }
    }

    return hatchPerHour - decayPerHour;
  },

  saveTimestamp: () => {
    set({ lastUpdate: Math.floor(Date.now() / 1000) });
  },
}));
