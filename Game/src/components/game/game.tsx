import { useState, useEffect } from "react";
import Dashboard from "../dashboard/dashboard";
import DevMode from "./DevMode";
import GameCanvas from "./gameCanvas";
import { useGameStore } from "../../state/gameState";
import { useSessionStore } from "../../state/sessionState";
import {
  useUIStore,
  type SelectedAction,
} from "../../state/uiState";
import {
  EGG_FOOD_COST, HATCH_RATE_BASE, CAPACITY_PER_CHAMBER,
  NATURAL_DECAY_RATE_PER_SECOND, DECAY_RATE_PER_SECOND, SEVERE_DECAY_RATE_PER_SECOND, STARVATION_RATE_PER_SECOND,
  aqForagingMultiplier,
} from "../../state/constants";

function pmToQuality(pm: number): { label: string; color: string } {
  if (pm <= 20) return { label: "Good", color: "text-green-400" };
  if (pm <= 35.4) return { label: "Moderate", color: "text-yellow-400" };
  if (pm <= 55.4) return { label: "Sensitive", color: "text-orange-400" };
  if (pm <= 150.4) return { label: "Unhealthy", color: "text-red-400" };
  return { label: "Very Unhealthy", color: "text-purple-400" };
}

function formatFood(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.floor(n));
}

const ACTIONS: { action: SelectedAction; label: string; activeColor: string }[] = [
  { action: "dig",  label: "Dig",   activeColor: "!bg-blue-600" },
  { action: "fill", label: "Fill",  activeColor: "!bg-green-600" },
  { action: "nest", label: "Nest",  activeColor: "!bg-purple-600" },
];

export default function Game() {
  const [dashboardOpen, setDashboard] = useState(false);
  const [devModeOpen, setDevMode] = useState(false);
  const [openPanel, setOpenPanel] = useState<"colony" | "popRate" | "foodRate" | null>(null);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [recruitAntTypeId, setRecruitAntTypeId] = useState<number | null>(null);
  const [recruitCount, setRecruitCount] = useState(10);

  // Nest modal — opens when user clicks a tunnel tile in "nest" mode
  const [nestModal, setNestModal] = useState<{ row: number; col: number } | null>(null);
  const [nestAntTypeId, setNestAntTypeId] = useState<number | null>(null);

  const [zoom, setZoom] = useState(1);
  const { username } = useSessionStore();
  const {
    saveGame, airQualityHistory, airQuality, population, antTypes, unlockedAntTypeIds,
    eggInventory, foodAmount, map, pollAirQuality, recruitAnts, unlockAntType,
    convertToNestingChamber, getHousingCapacity, getPopulationRatePerHour,
  } = useGameStore();
  const { selectedAction, setUIState } = useUIStore();

  // Latest valid PM: prefer the live-polled value, fall back to history
  const latestPm = airQuality > 0
    ? airQuality
    : ([...airQualityHistory].reverse().find((v) => v !== -1) ?? null);
  const quality = latestPm !== null ? pmToQuality(latestPm) : null;

  const totalPopulation = Math.round(population.reduce((sum, r) => sum + r.population, 0));
  const totalEggs = Object.values(eggInventory).reduce((s, v) => s + v, 0);
  const housingCapacity = getHousingCapacity();
  const housingColor =
    housingCapacity === 0              ? "text-neutral-400" :
    totalPopulation >= housingCapacity ? "text-red-400" :
    totalPopulation >= housingCapacity * 0.8 ? "text-yellow-400" : "text-green-400";

  // Count completed nesting chambers per ant type
  const chambersByType: Record<number, number> = {};
  for (const rowTiles of Object.values(map)) {
    for (const tile of Object.values(rowTiles)) {
      if (tile.type === "nesting_chamber" && tile.completion === null && tile.antTypeId !== undefined) {
        chambersByType[tile.antTypeId] = (chambersByType[tile.antTypeId] ?? 0) + 1;
      }
    }
  }

  const latestAq = airQuality > 0
    ? airQuality
    : ([...airQualityHistory].reverse().find((v) => v !== -1) ?? 0);
  const hatchMultiplier =
    latestAq <= 20    ? 1.0 :
    latestAq <= 35.4  ? 0.7 :
    latestAq <= 55.4  ? 0.5 :
    latestAq <= 150.4 ? 0.3 : 0.1;

  const ratePerHour = getPopulationRatePerHour();
  const rateLabel = ratePerHour === 0 ? "±0/hr"
    : ratePerHour > 0 ? `+${ratePerHour.toFixed(1)}/hr`
    : `${ratePerHour.toFixed(1)}/hr`;
  const rateColor = ratePerHour > 0 ? "text-green-400" : ratePerHour < 0 ? "text-red-400" : "text-neutral-400";

  // Food rate breakdown
  const aqForagingMult  = aqForagingMultiplier(latestAq);
  const baseForaging    = population.reduce((s, r) => s + r.population * r.antType.foraging, 0);
  const totalForaging   = baseForaging * aqForagingMult;
  const totalHunger     = population.reduce((s, r) => s + r.population * r.antType.hunger_cost, 0);
  const netFoodPerSec   = totalForaging - totalHunger;

  // Population rate breakdown
  const housingAvailable  = Math.max(0, housingCapacity - totalPopulation);
  const isStarving        = foodAmount === 0 && totalHunger > totalForaging;
  const aqDecayPerSec     = latestAq > 150.4 ? SEVERE_DECAY_RATE_PER_SECOND : latestAq > 20 ? DECAY_RATE_PER_SECOND : 0;
  const starvDecayPerSec  = isStarving ? STARVATION_RATE_PER_SECOND : 0;

  useEffect(() => {
    const tickId = setInterval(() => useGameStore.getState().tick(1), 1000);
    const pollId = setInterval(() => pollAirQuality(username), 30_000);
    pollAirQuality(username);
    return () => {
      clearInterval(tickId);
      clearInterval(pollId);
    };
  }, []);

  const unlockedTypes = antTypes.filter(at => unlockedAntTypeIds.includes(at.id));
  // kept for egg panel
  const typesWithEggs = antTypes.filter(at => unlockedAntTypeIds.includes(at.id) && (eggInventory[at.id] ?? 0) >= 1);

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {/* HUD */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
        <button
          onClick={() => setDashboard(true)}
          className="bg-black/40 hover:bg-black/60 backdrop-blur px-2 py-1 rounded text-[11px] text-white"
        >
          AQ Dashboard
        </button>
        <button
          onClick={() => setDevMode(o => !o)}
          className={`backdrop-blur px-2 py-1 rounded text-[11px] ${devModeOpen ? "bg-yellow-600 text-white" : "bg-black/40 hover:bg-black/60 text-yellow-400"}`}
        >
          Dev
        </button>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-white bg-black/30 backdrop-blur px-2 py-1 rounded">
          <span>
            AQ <span className={quality?.color ?? "text-neutral-400"}>{quality?.label ?? "—"}</span>
          </span>
          <span>🐜 {totalPopulation} <button
            onClick={() => setOpenPanel(o => o === "popRate" ? null : "popRate")}
            className={`${rateColor} hover:opacity-70 transition-opacity`}
          >({rateLabel})</button></span>
          <button
            onClick={() => setOpenPanel(o => o === "colony" ? null : "colony")}
            className={`${housingColor} hover:opacity-80 transition-opacity`}
            title="Toggle colony breakdown"
          >
            🏠 {totalPopulation}/{housingCapacity}
          </button>
          <span title={antTypes.filter(at => (eggInventory[at.id] ?? 0) >= 1).map(at => `${at.name}: ${Math.floor(eggInventory[at.id] ?? 0)}`).join(' · ') || 'No eggs'}>
            🥚 {Math.floor(totalEggs)}
          </span>
          <button
            onClick={() => setOpenPanel(o => o === "foodRate" ? null : "foodRate")}
            className={`${netFoodPerSec >= 0 ? "text-white" : "text-red-300"} hover:opacity-70 transition-opacity`}
          >🍯 {formatFood(foodAmount)} <span className={netFoodPerSec >= 0 ? "text-green-400" : "text-red-400"}>({netFoodPerSec >= 0 ? "+" : ""}{formatFood(netFoodPerSec * 3600)}/hr)</span></button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 bg-black/30 backdrop-blur rounded overflow-hidden text-[11px]">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="px-1.5 py-1 text-white hover:bg-black/40">−</button>
          <span className="text-white px-1">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="px-1.5 py-1 text-white hover:bg-black/40">+</button>

          {ACTIONS.map(({ action, label, activeColor }) => (
            <button
              key={action}
              onClick={() => setUIState({ selectedAction: selectedAction === action ? "none" : action })}
              className={`px-2 py-1 transition-colors ${
                selectedAction === action ? `${activeColor} text-white` : "text-white hover:bg-black/40"
              }`}
            >
              {label}
            </button>
          ))}

          <button
            onClick={() => {
              setRecruitAntTypeId(antTypes.find(at => unlockedAntTypeIds.includes(at.id))?.id ?? null);
              setRecruitCount(10);
              setRecruitOpen(true);
            }}
            className="px-2 py-1 text-white hover:bg-black/40"
          >
            Recruit
          </button>
          <button onClick={() => saveGame(username)} className="px-2 py-1 text-white hover:bg-black/40">
            Save
          </button>
        </div>
      </div>

      {/* ── Population rate breakdown panel ── */}
      {openPanel === "popRate" && (
        <div className="absolute top-11 left-2 z-20 bg-black/70 backdrop-blur rounded-lg p-2 text-xs text-white min-w-[260px]">
          <span className="text-neutral-400 uppercase tracking-wide text-[10px] font-semibold">Population Rate</span>

          <p className="text-neutral-500 text-[10px] mt-1.5 mb-0.5">Hatching / hr</p>

          {/* AQ hatch modifier */}
          <div className={`flex justify-between items-center px-1 py-0.5 mb-0.5 rounded ${hatchMultiplier < 1 ? "bg-orange-900/30" : "bg-green-900/20"}`}>
            <span className={hatchMultiplier < 1 ? "text-orange-300" : "text-green-400"}>
              AQ ({quality?.label ?? "—"}) hatch rate
            </span>
            <span className={`font-mono font-semibold ${hatchMultiplier < 1 ? "text-orange-300" : "text-green-400"}`}>
              ×{hatchMultiplier.toFixed(1)}
            </span>
          </div>

          {Object.entries(chambersByType).length === 0 ? (
            <p className="text-neutral-500 px-1">No chambers built</p>
          ) : (
            Object.entries(chambersByType).map(([idStr, chambers]) => {
              const id = Number(idStr);
              const at = antTypes.find(a => a.id === id);
              const hasEggs = (eggInventory[id] ?? 0) > 0;
              const typeCap = chambers * CAPACITY_PER_CHAMBER;
              const typePop = Math.round(population.find(r => r.antType.id === id)?.population ?? 0);
              const atCap = typePop >= typeCap;
              const rate = hasEggs && !atCap ? Math.round(HATCH_RATE_BASE * hatchMultiplier * chambers * 3600) : 0;
              return (
                <div key={id} className="flex justify-between px-1">
                  <span className="text-neutral-300">{at?.name ?? "?"} ({chambers} ch.) <span className="text-neutral-500">{typePop}/{typeCap}</span></span>
                  <span className={`font-mono ${atCap ? "text-red-400" : rate > 0 ? "text-emerald-400" : "text-neutral-500"}`}>
                    {atCap ? "at cap" : rate > 0 ? `+${rate}` : "no eggs"}
                  </span>
                </div>
              );
            })
          )}

          <p className="text-neutral-500 text-[10px] mt-1.5 mb-0.5">Losses / hr</p>
          <div className="flex justify-between px-1">
            <span className="text-neutral-300">Natural aging <span className="text-neutral-500">-1%/hr</span></span>
            <span className="text-red-400 font-mono">-{(totalPopulation * NATURAL_DECAY_RATE_PER_SECOND * 3600).toFixed(1)}</span>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-neutral-300">
              Air Quality ({quality?.label ?? "—"})
              {aqDecayPerSec > 0 && <span className="text-neutral-500 ml-1">-{(aqDecayPerSec * 3600 * 100).toFixed(0)}%/hr</span>}
            </span>
            <span className={`font-mono ${aqDecayPerSec === 0 ? "text-green-400" : "text-red-400"}`}>
              {aqDecayPerSec === 0 ? "none" : `-${(totalPopulation * aqDecayPerSec * 3600).toFixed(1)}`}
            </span>
          </div>
          {isStarving && (
            <div className="flex justify-between px-1">
              <span className="text-red-300">Starvation <span className="text-neutral-500">-1%/hr</span></span>
              <span className="text-red-400 font-mono">-{(totalPopulation * starvDecayPerSec * 3600).toFixed(1)}</span>
            </div>
          )}

          <div className="flex justify-between px-1 py-1 border-t border-neutral-700 mt-1 font-semibold">
            <span>Net</span>
            <span className={`font-mono ${ratePerHour >= 0 ? "text-green-400" : "text-red-400"}`}>
              {ratePerHour >= 0 ? "+" : ""}{ratePerHour.toFixed(1)}/hr
            </span>
          </div>
        </div>
      )}

      {/* ── Food rate breakdown panel ── */}
      {openPanel === "foodRate" && (
        <div className="absolute top-11 left-2 z-20 bg-black/70 backdrop-blur rounded-lg p-2 text-xs text-white min-w-[300px]">
          <span className="text-neutral-400 uppercase tracking-wide text-[10px] font-semibold">Food Rate</span>

          <div className="grid grid-cols-4 gap-1 text-[10px] text-neutral-500 mt-1.5 mb-0.5 px-1">
            <span>Type</span>
            <span className="text-right">Foraging</span>
            <span className="text-right">Hunger</span>
            <span className="text-right">Net</span>
          </div>

          {population.filter(r => r.population >= 0.5).map(r => {
            const foraging = r.population * r.antType.foraging * aqForagingMult;
            const hunger   = r.population * r.antType.hunger_cost;
            const net      = foraging - hunger;
            return (
              <div key={r.antType.id} className="grid grid-cols-4 gap-1 items-center py-0.5 border-t border-neutral-800 px-1">
                <span className="font-medium truncate">{r.antType.name}</span>
                <span className="text-right text-emerald-400 font-mono">+{foraging.toFixed(2)}</span>
                <span className="text-right text-red-400 font-mono">-{hunger.toFixed(2)}</span>
                <span className={`text-right font-mono ${net >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {net >= 0 ? "+" : ""}{net.toFixed(2)}
                </span>
              </div>
            );
          })}

          {/* AQ foraging modifier */}
          <div className={`flex justify-between items-center px-1 py-0.5 mt-0.5 rounded ${aqForagingMult < 1 ? "bg-orange-900/30" : "bg-green-900/20"}`}>
            <span className={aqForagingMult < 1 ? "text-orange-300" : "text-green-400"}>
              AQ ({quality?.label ?? "—"}) foraging
            </span>
            <span className={`font-mono font-semibold ${aqForagingMult < 1 ? "text-orange-300" : "text-green-400"}`}>
              ×{aqForagingMult.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 items-center py-0.5 border-t border-neutral-600 px-1 font-semibold mt-0.5">
            <span>Total</span>
            <span className="text-right text-emerald-400 font-mono">+{totalForaging.toFixed(2)}</span>
            <span className="text-right text-red-400 font-mono">-{totalHunger.toFixed(2)}</span>
            <span className={`text-right font-mono ${netFoodPerSec >= 0 ? "text-green-400" : "text-red-400"}`}>
              {netFoodPerSec >= 0 ? "+" : ""}{netFoodPerSec.toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-neutral-600 mt-1">food / second</p>
        </div>
      )}

      {/* ── Colony breakdown panel ── */}
      {openPanel === "colony" && (
        <div className="absolute top-11 left-2 z-20 bg-black/70 backdrop-blur rounded-lg p-2 text-xs text-white min-w-[320px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-neutral-400 uppercase tracking-wide text-[10px] font-semibold">Colony Breakdown</span>
            <span className="text-neutral-500 text-[10px]">🏠 {totalPopulation}/{housingCapacity} total housing</span>
          </div>

          {/* Header */}
          <div className="grid grid-cols-5 gap-1 text-[10px] text-neutral-500 mb-1 px-1">
            <span>Type</span>
            <span className="text-center">Pop</span>
            <span className="text-center">Chambers</span>
            <span className="text-center">Eggs</span>
            <span className="text-center">Hatch/hr</span>
          </div>

          {antTypes.filter(at => unlockedAntTypeIds.includes(at.id)).map(at => {
            const pop   = Math.round(population.find(r => r.antType.id === at.id)?.population ?? 0);
            const chs   = chambersByType[at.id] ?? 0;
            const eggs  = Math.floor(eggInventory[at.id] ?? 0);
            const hatch = eggs > 0 && chs > 0
              ? Math.round(HATCH_RATE_BASE * hatchMultiplier * chs * 3600)
              : 0;
            const cap   = chs * CAPACITY_PER_CHAMBER;
            const popColor = cap === 0 ? "text-neutral-400" : pop >= cap ? "text-red-400" : pop >= cap * 0.8 ? "text-yellow-400" : "text-green-400";
            return (
              <div key={at.id} className="grid grid-cols-5 gap-1 items-center py-0.5 border-t border-neutral-800 px-1">
                <span className="font-medium truncate">{at.name}</span>
                <span className={`text-center font-mono ${popColor}`}>{pop}</span>
                <span className="text-center text-neutral-300">{chs} <span className="text-neutral-500">({cap} cap)</span></span>
                <span className={`text-center font-mono ${eggs > 0 ? "text-purple-300" : "text-neutral-500"}`}>{eggs}</span>
                <span className={`text-center font-mono ${hatch > 0 ? "text-emerald-400" : "text-neutral-500"}`}>
                  {hatch > 0 ? `+${hatch}` : chs === 0 ? "no ch." : eggs === 0 ? "no eggs" : "0"}
                </span>
              </div>
            );
          })}

          <p className="text-[10px] text-neutral-600 mt-1 border-t border-neutral-800 pt-1">
            Each chamber hatches ~10 eggs/hr at good air quality · holds {CAPACITY_PER_CHAMBER} ants
          </p>
        </div>
      )}

      {/* ── Egg inventory panel (shown when Nest tool is active) ── */}
      {selectedAction === "nest" && (
        <div className="absolute top-11 left-2 z-20 bg-black/60 backdrop-blur rounded-lg px-2 py-1.5 text-xs text-white flex flex-col gap-0.5">
          <span className="text-neutral-400 uppercase tracking-wide text-[10px]">Available Eggs</span>
          {typesWithEggs.length === 0 ? (
            <span className="text-red-400">No eggs — recruit first</span>
          ) : (
            typesWithEggs.map(at => (
              <div key={at.id} className="flex justify-between gap-6">
                <span className="text-neutral-300">{at.name}</span>
                <span className="font-medium">{Math.floor(eggInventory[at.id] ?? 0)} 🥚</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Recruit / Unlock Modal ── */}
      {recruitOpen && (() => {
        const unlockedTypes = antTypes.filter((at) => unlockedAntTypeIds.includes(at.id));
        const lockedTypes   = antTypes.filter((at) => !unlockedAntTypeIds.includes(at.id));
        const selectedType  = antTypes.find((a) => a.id === recruitAntTypeId);
        const eggsAfter     = recruitCount * EGG_FOOD_COST;
        const canRecruit    = foodAmount >= eggsAfter;

        return (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-96 flex flex-col gap-4 text-white">
              <h2 className="text-lg font-semibold">Ant Colony</h2>

              {/* Egg inventory summary */}
              {Object.keys(eggInventory).length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs bg-neutral-800 rounded p-2">
                  {antTypes.filter(at => (eggInventory[at.id] ?? 0) > 0).map(at => (
                    <span key={at.id} className="text-neutral-300">
                      {at.name}: <span className="text-white font-medium">{Math.floor(eggInventory[at.id] ?? 0)} 🥚</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Recruit section */}
              {unlockedTypes.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-neutral-400 uppercase tracking-wide">Recruit Eggs</p>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-400">Ant Type</label>
                    <select
                      value={recruitAntTypeId ?? ""}
                      onChange={(e) => setRecruitAntTypeId(Number(e.target.value))}
                      className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-sm"
                    >
                      {unlockedTypes.map((at) => (
                        <option key={at.id} value={at.id}>{at.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedType && unlockedAntTypeIds.includes(selectedType.id) && (
                    <div className="text-xs text-neutral-400 bg-neutral-800 rounded p-2 grid grid-cols-2 gap-1">
                      <span>Foraging: <span className="text-white">{selectedType.foraging}</span></span>
                      <span>Mining: <span className="text-white">{selectedType.mining}</span></span>
                      <span>Hunger: <span className="text-white">{selectedType.hunger_cost}</span></span>
                      <span>Attack: <span className="text-white">{selectedType.attack}</span></span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-400">Number of Eggs</label>
                    <input
                      type="number"
                      min={1}
                      value={recruitCount}
                      onChange={(e) => setRecruitCount(Math.max(1, Number(e.target.value)))}
                      className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${canRecruit ? "text-neutral-400" : "text-red-400"}`}>
                      Cost: 🍯 {eggsAfter} food
                    </span>
                    <button
                      onClick={() => {
                        if (recruitAntTypeId !== null) recruitAnts(recruitAntTypeId, recruitCount);
                        setRecruitOpen(false);
                      }}
                      disabled={!canRecruit}
                      className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Get Eggs
                    </button>
                  </div>
                </div>
              )}

              {/* Unlock section */}
              {lockedTypes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-neutral-400 uppercase tracking-wide">Unlock New Types</p>
                  {lockedTypes.map((at) => (
                    <div key={at.id} className="flex items-center justify-between bg-neutral-800 rounded p-2 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{at.name}</span>
                        <span className="text-xs text-neutral-400">
                          Foraging {at.foraging} · Mining {at.mining} · Hunger {at.hunger_cost} · Attack {at.attack}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          const { success, message } = await unlockAntType(username, at.id);
                          if (!success) alert(message);
                        }}
                        disabled={foodAmount < at.unlock_cost}
                        className="ml-3 shrink-0 px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        🍯 {formatFood(at.unlock_cost)}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setRecruitOpen(false)}
                  className="px-3 py-1.5 text-sm rounded bg-neutral-700 hover:bg-neutral-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Nest Chamber Modal ── */}
      {nestModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-80 flex flex-col gap-4 text-white">
            <h2 className="text-lg font-semibold">Place Nesting Chamber</h2>
            <p className="text-xs text-neutral-400">Costs 100 🍯. Eggs placed in this chamber will hatch into the selected ant type (~10/hr at good air quality).</p>

            {unlockedTypes.length === 0 ? (
              <p className="text-sm text-red-400">No ant types unlocked.</p>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">Ant Type</label>
                  <select
                    value={nestAntTypeId ?? ""}
                    onChange={(e) => setNestAntTypeId(Number(e.target.value))}
                    className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-sm"
                  >
                    {unlockedTypes.map((at) => (
                      <option key={at.id} value={at.id}>{at.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={() => setNestModal(null)} className="px-3 py-1.5 text-sm rounded bg-neutral-700 hover:bg-neutral-600">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (nestAntTypeId !== null) convertToNestingChamber(nestModal.row, nestModal.col, nestAntTypeId);
                      setNestModal(null);
                    }}
                    disabled={foodAmount < 100}
                    className="px-3 py-1.5 text-sm rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Place (100 🍯)
                  </button>
                </div>
              </>
            )}

            {unlockedTypes.length === 0 && (
              <button onClick={() => setNestModal(null)} className="self-end px-3 py-1.5 text-sm rounded bg-neutral-700 hover:bg-neutral-600">
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {dashboardOpen && <Dashboard setDashboard={setDashboard} />}
      {devModeOpen && <DevMode onClose={() => setDevMode(false)} />}

      <GameCanvas
        zoom={zoom}
        onNestClick={(row, col) => {
          setNestAntTypeId(unlockedTypes[0]?.id ?? null);
          setNestModal({ row, col });
        }}
      />
    </div>
  );
}
