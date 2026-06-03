export const SERVER_BASE_URL = "http://127.0.0.1:5000/";

const MULTIPLIER = 10;

export const TILE_COMPLETION_MS = 120 * 1000;

export const GROWTH_RATE_PER_SECOND = 5 / (100 * 3600);         // +5%/hr — good air
export const NATURAL_DECAY_RATE_PER_SECOND = 1 / (100 * 3600); // -1%/hr — always (aging)
export const DECAY_RATE_PER_SECOND = 2 / (100 * 3600);          // -2%/hr — moderate/unhealthy (on top of natural)
export const SEVERE_DECAY_RATE_PER_SECOND = 6 / (100 * 3600);   // -6%/hr — very unhealthy (on top of natural)
export const STARVATION_RATE_PER_SECOND = 1 / (100 * 3600);     // extra -1%/hr when food = 0
export const MIN_TOTAL_POPULATION = 5;
export const MAX_CATCHUP_SECONDS = 24 * 60 * 60;

// Nesting & egg hatching
export const HATCH_RATE_BASE = 10 / 3600;   // ants/second per nesting_chamber at Good AQ
export const CAPACITY_PER_CHAMBER = 10;     // max ants a single nesting_chamber can house

// Food costs for actions
export const DIG_FOOD_COST = 10;
export const FILL_FOOD_COST = 5;
export const NEST_FOOD_COST = 100;
export const EGG_FOOD_COST = 5;             // food per egg recruited

// Foraging efficiency scales with air quality — bad air keeps ants underground
export const aqForagingMultiplier = (pm: number): number =>
  pm <= 20    ? 1.0  :
  pm <= 35.4  ? 0.9  :
  pm <= 55.4  ? 0.7  :
  pm <= 150.4 ? 0.5  : 0.25;