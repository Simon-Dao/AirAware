import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSessionStore } from "../../state/sessionState";
import { SERVER_BASE_URL } from "../../state/constants";

interface ChartPoint {
  time: string;
  aq: number;
}

function toApiDate(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

type Props = {
  date: Date;
  onDateChange: (d: Date) => void;
};

function Timeline({ date, onDateChange }: Props) {
  const username = useSessionStore((s) => s.username);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const dateLabel = date.toLocaleString("default", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!username) return;

    const fetchData = () => {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      setLoading(true);
      axios
        .get(SERVER_BASE_URL + "user/get/data", {
          params: {
            username,
            begin_time: toApiDate(start),
            end_time: toApiDate(end),
          },
        })
        .then((res) => {
          const readings = res.data as { pm: number; timestamp: string }[];
          const mapped = readings.map((r) => {
            const d = new Date(r.timestamp);
            const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
            return { time, aq: r.pm };
          });
          mapped.sort((a, b) => a.time.localeCompare(b.time));
          setChartData(mapped);
        })
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [username, date]);

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      {/* Day Selector */}
      <div className="flex w-full h-8 text-center">
        <div
          className="flex-1 cursor-pointer select-none hover:bg-gray-200 rounded"
          onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); onDateChange(d); }}
        >
          {"<"}
        </div>
        <div className="flex-2 rounded flex items-center justify-center">
          {dateLabel}
        </div>
        <div
          className="flex-1 cursor-pointer select-none hover:bg-gray-200 rounded"
          onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); onDateChange(d); }}
        >
          {">"}
        </div>
      </div>

      {/* Graph */}
      <div className="w-full h-full">
        {loading ? (
          <div className="text-center text-white w-full h-full flex items-center justify-center">
            Loading...
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis
                label={{ value: "PM", angle: -90, position: "insideLeft" }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="aq"
                stroke="#3b82f6"
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-white w-full h-full flex items-center justify-center">
            No data
          </div>
        )}
      </div>
    </div>
  );
}

export default Timeline;
