import { useState, useEffect } from "react";
import axios from "axios";
import { useSessionStore } from "../../state/sessionState";
import { useGameStore } from "../../state/gameState";
import { SERVER_BASE_URL } from "../../state/constants";

type Reading = {
  id: number;
  pm: number;
  timestamp: string;
  latitude: number;
  longitude: number;
};

function pmColor(pm: number) {
  if (pm <= 20)    return "text-green-400";
  if (pm <= 35.4)  return "text-yellow-400";
  if (pm <= 55.4)  return "text-orange-400";
  if (pm <= 150.4) return "text-red-400";
  return "text-purple-400";
}

// Convert datetime-local string to ISO UTC string
function toISO(s: string): string {
  if (!s) return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  if (s.endsWith("Z") || s.match(/[+-]\d{2}:\d{2}$/)) return s;
  return s.replace("T", "T").padEnd(19, ":00").slice(0, 19) + "Z";
}

// Convert ISO string to datetime-local value (YYYY-MM-DDTHH:MM)
function toLocalInput(iso: string): string {
  return iso.replace("Z", "").slice(0, 16);
}

export default function DevMode({ onClose }: { onClose: () => void }) {
  const { username } = useSessionStore();
  const pollAirQuality = useGameStore(s => s.pollAirQuality);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editPm, setEditPm]   = useState("");
  const [editTs, setEditTs]   = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLon, setEditLon] = useState("");

  const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  const [addPm,  setAddPm]  = useState("25");
  const [addTs,  setAddTs]  = useState(nowLocal);
  const [addLat, setAddLat] = useState("0");
  const [addLon, setAddLon] = useState("0");

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const end   = new Date();
      const begin = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      const res   = await axios.get(SERVER_BASE_URL + "user/get/readings", {
        params: {
          username,
          begin_time: begin.toISOString().replace(/\.\d{3}Z$/, "Z"),
          end_time:   end.toISOString().replace(/\.\d{3}Z$/, "Z"),
        },
      });
      const sorted = [...(res.data.readings as Reading[])].sort(
        (a, b) => b.timestamp.localeCompare(a.timestamp)
      );
      setReadings(sorted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReadings(); }, []);

  const deleteReading = async (id: number) => {
    await axios.delete(SERVER_BASE_URL + `user/delete/reading/${id}`);
    await fetchReadings();
    pollAirQuality(username);
  };

  const startEdit = (r: Reading) => {
    setEditId(r.id);
    setEditPm(String(r.pm));
    setEditTs(toLocalInput(r.timestamp));
    setEditLat(String(r.latitude));
    setEditLon(String(r.longitude));
  };

  const saveEdit = async () => {
    if (editId === null) return;
    await axios.put(SERVER_BASE_URL + `user/update/reading/${editId}`, {
      pm:        parseFloat(editPm),
      timestamp: toISO(editTs),
      latitude:  parseFloat(editLat),
      longitude: parseFloat(editLon),
    });
    setEditId(null);
    await fetchReadings();
    pollAirQuality(username);
  };

  const addReading = async () => {
    await axios.post(SERVER_BASE_URL + "user/add/data", {
      username,
      pm:        parseFloat(addPm),
      timestamp: toISO(addTs),
      latitude:  parseFloat(addLat),
      longitude: parseFloat(addLon),
    });
    setAddTs(nowLocal());
    await fetchReadings();
    pollAirQuality(username);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-yellow-600/40 rounded-xl p-4 w-[640px] max-h-[80vh] flex flex-col gap-3 text-white text-xs">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-yellow-400 font-semibold text-sm">⚙ Dev Mode — AQ Readings</span>
          <button onClick={onClose} className="text-neutral-400 hover:text-white px-1">✕</button>
        </div>

        {/* Add reading */}
        <div className="flex gap-2 items-end bg-neutral-800 rounded p-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-neutral-500">PM</label>
            <input type="number" value={addPm} onChange={e => setAddPm(e.target.value)} min={0}
              className="bg-neutral-700 rounded px-1.5 py-1 w-16 text-white" />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-neutral-500">Timestamp</label>
            <input type="datetime-local" value={addTs} onChange={e => setAddTs(e.target.value)}
              className="bg-neutral-700 rounded px-1.5 py-1 text-white w-full" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-neutral-500">Lat</label>
            <input type="number" value={addLat} onChange={e => setAddLat(e.target.value)}
              className="bg-neutral-700 rounded px-1.5 py-1 w-16 text-white" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-neutral-500">Lon</label>
            <input type="number" value={addLon} onChange={e => setAddLon(e.target.value)}
              className="bg-neutral-700 rounded px-1.5 py-1 w-16 text-white" />
          </div>
          <button onClick={addReading}
            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded font-medium shrink-0">
            + Add
          </button>
        </div>

        {/* Column headers */}
        <div className="flex gap-2 px-2 text-[10px] text-neutral-500 uppercase tracking-wide">
          <span className="flex-1">Timestamp</span>
          <span className="w-14 text-center">PM</span>
          <span className="w-16 text-center">Lat</span>
          <span className="w-16 text-center">Lon</span>
          <span className="w-16" />
        </div>

        {/* Readings list */}
        <div className="overflow-y-auto flex-1 flex flex-col gap-0.5">
          {loading ? (
            <p className="text-neutral-500 text-center py-6">Loading…</p>
          ) : readings.length === 0 ? (
            <p className="text-neutral-500 text-center py-6">No readings in the last 30 days</p>
          ) : readings.map(r => (
            <div key={r.id}
              className={`flex gap-2 items-center px-2 py-1 rounded ${editId === r.id ? "bg-neutral-700" : "bg-neutral-800 hover:bg-neutral-750"}`}
            >
              {editId === r.id ? (
                <>
                  <input type="datetime-local" value={editTs} onChange={e => setEditTs(e.target.value)}
                    className="flex-1 bg-neutral-600 rounded px-1.5 py-0.5 text-white min-w-0" />
                  <input type="number" value={editPm} onChange={e => setEditPm(e.target.value)}
                    className="w-14 bg-neutral-600 rounded px-1.5 py-0.5 text-white text-center" />
                  <input type="number" value={editLat} onChange={e => setEditLat(e.target.value)}
                    className="w-16 bg-neutral-600 rounded px-1.5 py-0.5 text-white text-center" />
                  <input type="number" value={editLon} onChange={e => setEditLon(e.target.value)}
                    className="w-16 bg-neutral-600 rounded px-1.5 py-0.5 text-white text-center" />
                  <div className="w-16 flex gap-1">
                    <button onClick={saveEdit}
                      className="flex-1 py-0.5 bg-blue-600 hover:bg-blue-500 rounded font-medium">✓</button>
                    <button onClick={() => setEditId(null)}
                      className="flex-1 py-0.5 bg-neutral-600 hover:bg-neutral-500 rounded">✕</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex-1 font-mono text-neutral-300 truncate cursor-pointer"
                    onClick={() => startEdit(r)}>
                    {r.timestamp.replace("T", " ").slice(0, 19)}
                  </span>
                  <span className={`w-14 font-mono text-center cursor-pointer ${pmColor(r.pm)}`}
                    onClick={() => startEdit(r)}>
                    {r.pm}
                  </span>
                  <span className="w-16 font-mono text-center text-neutral-500 cursor-pointer"
                    onClick={() => startEdit(r)}>
                    {r.latitude}
                  </span>
                  <span className="w-16 font-mono text-center text-neutral-500 cursor-pointer"
                    onClick={() => startEdit(r)}>
                    {r.longitude}
                  </span>
                  <div className="w-16 flex gap-1">
                    <button onClick={() => startEdit(r)}
                      className="flex-1 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded">✎</button>
                    <button onClick={() => deleteReading(r.id)}
                      className="flex-1 py-0.5 bg-red-900 hover:bg-red-800 rounded">✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-neutral-800 pt-2">
          <span className="text-neutral-500">{readings.length} readings · last 30 days · click row to edit / drag timestamp to move</span>
          <button onClick={fetchReadings} className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded">
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
