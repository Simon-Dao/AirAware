import { useState, useEffect } from "react";
import Dashboard from "../dashboard/dashboard";
import GameCanvas from "./gameCanvas";
import { useGameStore } from "../../state/gameState";
import { useSessionStore } from "../../state/sessionState";
import {
  useUIStore,
  type SelectedAction,
} from "../../state/uiState";

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
  return String(n);
}

const ACTIONS: { action: SelectedAction; label: string }[] = [
  { action: "dig", label: "Dig Tunnel" },
  { action: "fill", label: "Fill Tunnel" },
];

export default function Game() {
  const [dashboardOpen, setDashboard] = useState(false);
  const [zoom, setZoom] = useState(1);
  const { username } = useSessionStore();
  const { saveGame, airQualityHistory, population, foodAmount } =
    useGameStore();
  const {selectedAction, setUIState } = useUIStore();

  // Latest valid hourly PM average
  const latestPm =
    [...airQualityHistory].reverse().find((v) => v !== -1) ?? null;
  const quality = latestPm !== null ? pmToQuality(latestPm) : null;

  const totalPopulation = Math.round(population.reduce((sum, r) => sum + r.population, 0));

  useEffect(() => {
    const id = setInterval(() => useGameStore.getState().tick(1), 1000);
    return () => clearInterval(id);
  }, []);

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
            AQ{" "}
            <span className={quality?.color ?? "text-neutral-400"}>
              {quality?.label ?? "—"}
            </span>
          </span>
          <span>🐜 {totalPopulation}</span>
          <span>🍯 {formatFood(foodAmount)}</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-black/30 backdrop-blur rounded-md overflow-hidden">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="px-2 py-1 text-white hover:bg-black/40"
          >
            −
          </button>

          <span className="text-xs text-white px-1">
            {(zoom * 100).toFixed(0)}%
          </span>

          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            className="px-2 py-1 text-white hover:bg-black/40"
          >
            +
          </button>
          {ACTIONS.map(({ action, label }) => (
            <button
              key={action}
              onClick={() =>
                setUIState({
                  selectedAction: selectedAction === action ? "none" : action,
                })
              }
              className={`px-2 py-1 text-xs transition-colors ${
                selectedAction === action
                  ? action === "fill" ? "!bg-green-600 text-white" : "!bg-blue-600 text-white"
                  : "text-white hover:bg-black/40"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => saveGame(username)}
            className="px-2 py-1 text-white hover:bg-black/40"
          >
            Save Game
          </button>
        </div>
      </div>

      {dashboardOpen && <Dashboard setDashboard={setDashboard} />}

      <GameCanvas zoom={zoom} />
    </div>
  );
}
