import { useState, useEffect, type SetStateAction } from "react";
import axios from "axios";
import "./card.css";
import Calendar from "./calendar";
import Timeline from "./timeline";
import Map from "./map";
import { useSessionStore } from "../../state/sessionState";
import { SERVER_BASE_URL } from "../../state/constants";

type DashboardProps = {
  setDashboard: React.Dispatch<SetStateAction<boolean>>;
};

function toApiDate(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function pmToQuality(pm: number): { label: string; color: string } {
  if (pm <= 20) return { label: "Good", color: "text-green-400" };
  if (pm <= 35.4) return { label: "Moderate", color: "text-yellow-400" };
  if (pm <= 55.4) return { label: "Unhealthy for Sensitive", color: "text-orange-400" };
  if (pm <= 150.4) return { label: "Unhealthy", color: "text-red-400" };
  return { label: "Very Unhealthy", color: "text-purple-400" };
}


function Dashboard({ setDashboard }: DashboardProps) {
  const username = useSessionStore((s) => s.username);
  const logout = useSessionStore((s) => s.logout);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [streak, setStreak] = useState<number>(0);
  const [latestPm, setLatestPm] = useState<number | null>(null);
  const [avg24hPm, setAvg24hPm] = useState<number | null>(null);

  useEffect(() => {
    if (!username) return;

    const fetchData = () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      axios
        .get(SERVER_BASE_URL + "user/get/readings", {
          params: {
            username,
            begin_time: toApiDate(start),
            end_time: toApiDate(end),
          },
        })
        .then((res) => {
          const readings = res.data.readings as { pm: number; timestamp: string }[];
          if (readings.length === 0) return;

          const sorted = [...readings].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setLatestPm(sorted[0].pm);

          const cutoff = Date.now() - 24 * 60 * 60 * 1000;
          const last24h = readings.filter((r) => new Date(r.timestamp).getTime() >= cutoff);
          if (last24h.length > 0) {
            const avg = last24h.reduce((sum, r) => sum + r.pm, 0) / last24h.length;
            setAvg24hPm(avg);
          }

          const daySet = new Set(
            readings.map((r) => {
              const d = new Date(r.timestamp);
              return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
          );
          let count = 0;
          const cursor = new Date();
          cursor.setHours(0, 0, 0, 0);
          while (true) {
            const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
            if (!daySet.has(key)) break;
            count++;
            cursor.setDate(cursor.getDate() - 1);
          }
          setStreak(count);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [username]);

  const quality = latestPm !== null ? pmToQuality(latestPm) : null;
  const score = avg24hPm !== null ? pmToQuality(avg24hPm) : null;

  return (
    <>
      <div className="z-50 fixed top-0 left-0 w-screen h-screen flex items-start bg-[#242424]">
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
              {username ? username[0].toUpperCase() : "?"}
            </div>
            <div>
              <h2 className="text-white font-semibold">{username || "Guest"}</h2>
            </div>
          </div>

          {/* Streak */}
          <div className="mb-6 p-3 rounded-lg bg-neutral-800">
            <p className="text-xs text-neutral-400">Current Streak</p>
            <p className="text-xl font-bold text-white">🔥 {streak} Day{streak !== 1 ? "s" : ""}</p>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="p-3 rounded-lg bg-neutral-800 flex flex-col justify-between items-start">
              <span className="text-sm text-neutral-400">Current Air Quality</span>
              <span className={`text-sm font-semibold ${quality?.color ?? "text-neutral-400"}`}>
                {latestPm?.toFixed(2)} pm2
                <br />
                {quality?.label ?? "—"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-800 flex flex-col justify-between items-start">
              <span className="text-sm text-neutral-400">Daily AQ Score</span>
              <span className={`text-sm font-semibold ${score?.color ?? "text-neutral-400"}`}>
                24 Hour Average: {avg24hPm?.toFixed(2)} pm2
                <br />
                {score?.label ?? "—"}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="mt-auto text-sm text-red-400 hover:text-red-300"
          >
            Logout
          </button>
        </nav>

        <main className="h-full flex-1 flex">
          <div className="w-1/2 h-full flex flex-col">
            <div className="h-full card">
              <h2>Streak Calendar</h2>
              <Calendar onDateChange={setSelectedDate} />
            </div>
            <div className="h-full card">
              <h2>Daily AQ Timeline</h2>
              <Timeline date={selectedDate} onDateChange={setSelectedDate} />
            </div>
          </div>
          <div className="w-1/2 h-[98.5%] card">
            <h2>AQ Map</h2>
            <div className="w-full h-[calc(100%-2.5rem)]">
              <Map date={selectedDate} />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default Dashboard;