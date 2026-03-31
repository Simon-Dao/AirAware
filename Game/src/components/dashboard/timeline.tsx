import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AQData {
  hour: number; // 0-23
  minute: number; // 0-59
  aq: number; // Air quality value
  lat?: number;
  long?: number;
}

function Timeline() {
  const [aqData] = useState<AQData[]>([
    { hour: 6, minute: 30, aq: 50 },
    { hour: 12, minute: 15, aq: 95 },
    { hour: 18, minute: 45, aq: 80 },
    { hour: 22, minute: 0, aq: 60 },
  ]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const date = currentDate.toLocaleString("default", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  // Format data for recharts
  const chartData = aqData.map((point) => ({
    time: `${String(point.hour).padStart(2, "0")}:${String(point.minute).padStart(2, "0")}`,
    aq: point.aq,
  }));

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      {/* Day Selector */}
      <div className="flex w-full h-8 text-center">
        <div
          className="flex-1 cursor-pointer select-none hover:bg-gray-200 rounded"
          onClick={handlePrevDay}
        >
          {"<"}
        </div>
        <div className="flex-2 rounded flex items-center justify-center">
          {date}
        </div>
        <div
          className="flex-1 cursor-pointer select-none hover:bg-gray-200 rounded"
          onClick={handleNextDay}
        >
          {">"}
        </div>
      </div>

      {/* Graph */}
      <div className="w-full h-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis
                label={{ value: "AQ", angle: -90, position: "insideLeft" }}
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
