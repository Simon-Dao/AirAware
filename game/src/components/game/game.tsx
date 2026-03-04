import { useState } from "react";
import Dashboard from "../dashboard/dashboard";
import GameCanvas from "./gameCanvas";

export default function Game() {
  const [dashboardOpen, setDashboard] = useState(false);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="w-screen h-screen relative overflow-hidden">

      {/* HUD */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">

        <button
          onClick={() => setDashboard(true)}
          className="bg-black/40 hover:bg-black/60 backdrop-blur px-3 py-1.5 rounded-md text-xs text-white"
        >
          Dashboard
        </button>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-white bg-black/30 backdrop-blur px-3 py-1.5 rounded-md">

          <span>AQ <span className="text-green-400">Good</span></span>
          <span>🔥 1d</span>
          <span>🐜 4/11</span>
          <span>👑 1</span>
          <span>🍯 1.2M</span>

        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-black/30 backdrop-blur rounded-md overflow-hidden">

          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="px-2 py-1 text-white hover:bg-black/40"
          >
            −
          </button>

          <span className="text-xs text-white px-1">
            {(zoom * 100).toFixed(0)}%
          </span>

          <button
            onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            className="px-2 py-1 text-white hover:bg-black/40"
          >
            +
          </button>

        </div>

      </div>

      {dashboardOpen && <Dashboard setDashboard={setDashboard} />}

      <GameCanvas zoom={zoom} />

    </div>
  );
}