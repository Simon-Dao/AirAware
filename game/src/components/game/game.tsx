import { useEffect, useRef, useState } from "react";
import Dashboard from "../dashboard/dashboard";
import GameCanvas from "./gameCanvas";

export default function Game() {
  const [dashboardOpen, setDashboard] = useState(false);

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-20">
        {dashboardOpen && <Dashboard setDashboard={setDashboard} />}

        <button
          onClick={() => setDashboard(true)}
          className="mb-2 bg-black text-white px-3 py-1 rounded"
        >
          Open Dashboard
        </button>

        <div className="text-black">
          <h2>AQ: Good</h2>
          <h2>Clean Air Streak: 1 day</h2>
          <h2>Population: 4/11</h2>
          <h2>Queen: 1/1</h2>
          <h2>Workers: 3/10</h2>
          <h2>Food: 1231312</h2>
        </div>
      </div>

      <GameCanvas />
    </div>
  );
}