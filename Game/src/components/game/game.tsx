import { useState, useEffect } from "react";
import Dashboard from "../dashboard/dashboard";
import GameCanvas from "./gameCanvas";
import { useGameStore } from "../../state/gameState";
import { useSessionStore } from "../../state/sessionState";
import {
  useUIStore,
  type SelectedAction,
} from "../../state/uiState";
import { EGG_FOOD_COST, HATCH_RATE_BASE, CAPACITY_PER_CHAMBER } from "../../state/constants";

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
  { action: "dig",  label: "Dig Tunnel",    activeColor: "!bg-blue-600" },
  { action: "fill", label: "Fill Tunnel",   activeColor: "!bg-green-600" },
  { action: "nest", label: "Nest Chamber",  activeColor: "!bg-purple-600" },
];

export default function Game() {
  const [dashboardOpen, setDashboard] = useState(false);
  const [colonyOpen, setColonyOpen] = useState(false);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [recruitAntTypeId, setRecruitAntTypeId] = useState<number | null>(null);
  const [recruitCount, setRecruitCount] = useState(10);

  // Nest modal — opens when user clicks a tunnel tile in "nest" mode
  const [nestModal, setNestModal] = useState<{ row: number; col: number } | null>(null);
  const [nestAntTypeId, setNestAntTypeId] = useState<number | null>(null);

  const [zoom, setZoom] = useState(1);
  const { username } = useSessionStore();
  const {
    saveGame, airQualityHistory, population, antTypes, unlockedAntTypeIds,
    eggInventory, foodAmount, map, pollAirQuality, recruitAnts, unlockAntType,
    convertToNestingChamber, getHousingCapacity, getPopulationRatePerHour,
  } = useGameStore();
  const { selectedAction, setUIState } = useUIStore();

  // Latest valid hourly PM average
  const latestPm = [...airQualityHistory].reverse().find((v) => v !== -1) ?? null;
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

  const latestAq = [...airQualityHistory].reverse().find((v) => v !== -1) ?? 0;
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
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <button
          onClick={() => setDashboard(true)}
          className="bg-black/40 hover:bg-black/60 backdrop-blur px-3 py-1.5 rounded-md text-xs text-white"
        >
          Air Quality Dashboard
        </button>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-white bg-black/30 backdrop-blur px-3 py-1.5 rounded-md">
          <span>
            AQ <span className={quality?.color ?? "text-neutral-400"}>{quality?.label ?? "—"}</span>
          </span>
          <span>🐜 {totalPopulation} <span className={rateColor}>({rateLabel})</span></span>
          <button
            onClick={() => setColonyOpen(o => !o)}
            className={`${housingColor} hover:opacity-80 transition-opacity`}
            title="Toggle colony breakdown"
          >
            🏠 {totalPopulation}/{housingCapacity}
          </button>
          <span title={antTypes.filter(at => (eggInventory[at.id] ?? 0) >= 1).map(at => `${at.name}: ${Math.floor(eggInventory[at.id] ?? 0)}`).join(' · ') || 'No eggs'}>
            🥚 {Math.floor(totalEggs)}
          </span>
          <span>🍯 {formatFood(foodAmount)}</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 bg-black/30 backdrop-blur rounded-md overflow-hidden">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="px-2 py-1 text-white hover:bg-black/40">−</button>
          <span className="text-xs text-white px-1">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="px-2 py-1 text-white hover:bg-black/40">+</button>

          {ACTIONS.map(({ action, label, activeColor }) => (
            <button
              key={action}
              onClick={() => setUIState({ selectedAction: selectedAction === action ? "none" : action })}
              className={`px-2 py-1 text-xs transition-colors ${
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
            + Recruit
          </button>
          <button onClick={() => saveGame(username)} className="px-2 py-1 text-white hover:bg-black/40">
            Save
          </button>
        </div>
      </div>

      {/* ── Colony breakdown panel ── */}
      {colonyOpen && (
        <div className="absolute top-14 left-4 z-20 bg-black/70 backdrop-blur rounded-lg p-3 text-xs text-white min-w-[320px]">
          <div className="flex items-center justify-between mb-2">
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
              <div key={at.id} className="grid grid-cols-5 gap-1 items-center py-1 border-t border-neutral-800 px-1">
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

          <p className="text-[10px] text-neutral-600 mt-2 border-t border-neutral-800 pt-2">
            Each chamber hatches ~10 eggs/hr at good air quality · holds {CAPACITY_PER_CHAMBER} ants
          </p>
        </div>
      )}

      {/* ── Egg inventory panel (shown when Nest tool is active) ── */}
      {selectedAction === "nest" && (
        <div className="absolute top-16 left-4 z-20 bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-xs text-white flex flex-col gap-1">
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
