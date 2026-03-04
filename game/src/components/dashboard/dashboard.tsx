import { useState, type SetStateAction } from "react";
import "./card.css";
import Calendar from "./calendar";
import Timeline from "./timeline";
import Map from "./map";
type DashboardProps = {
  setDashboard: React.Dispatch<SetStateAction<boolean>>;
};

function Dashboard({ setDashboard }: DashboardProps) {
  return (
    <>
      <div className="fixed top-0 left-0 w-screen h-screen flex items-start bg-[#242424]">
        <nav className="p-4 flex flex-col h-full min-w-[260px] bg-[#1f1f1f] border-r border-neutral-700">
          {/* Close */}
          <button
            onClick={() => setDashboard(false)}
            className="mb-4 text-sm text-neutral-400 hover:text-white"
          >
            Back To Colony
          </button>

          {/* Profile */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-neutral-600 flex items-center justify-center text-lg font-semibold">
              U
            </div>

            <div>
              <h2 className="text-white font-semibold">Username</h2>
              <p className="text-xs text-neutral-400">Level 4 Explorer</p>
            </div>
          </div>

          {/* Streak */}
          <div className="mb-6 p-3 rounded-lg bg-neutral-800">
            <p className="text-xs text-neutral-400">Current Streak</p>
            <p className="text-xl font-bold text-white">🔥 7 Days</p>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="p-3 rounded-lg bg-neutral-800 flex justify-between items-center">
              <span className="text-sm text-neutral-400">Air Quality</span>
              <span className="text-sm font-semibold text-green-400">Good</span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-800 flex justify-between items-center">
              <span className="text-sm text-neutral-400">AQ Score</span>
              <span className="text-sm font-semibold text-blue-400">82</span>
            </div>
          </div>

          {/* Quick actions */}
          {/* <div className="flex flex-col gap-2 mb-6">
            <button className="p-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm text-white">
              View Achievements
            </button>

            <button className="p-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm text-white">
              Settings
            </button>
          </div> */}

          {/* Logout */}
          <button className="mt-auto text-sm text-red-400 hover:text-red-300">
            Logout
          </button>
        </nav>

        <main className="h-full flex-1 flex bg-green-400">
          <div className="w-1/2 h-full flex flex-col">
            <div className="h-full card">
              <Calendar />
            </div>
            <div className="h-full card">
              <Timeline />
            </div>
          </div>
          <div className="w-1/2 h-[98.5%] card">
            <Map />
          </div>
        </main>
      </div>
    </>
  );
}

export default Dashboard;
