import { useEffect, useState } from "react";
import axios from "axios";
import { useSessionStore } from "../../state/sessionState";
import { SERVER_BASE_URL } from "../../state/constants";

function toApiDate(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function Calendar() {
  const username = useSessionStore((s) => s.username);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set());

  const monthYear = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!username) return;

    const fetchData = () => {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      axios
        .get(SERVER_BASE_URL + "user/get/data", {
          params: {
            username,
            begin_time: toApiDate(start),
            end_time: toApiDate(end),
          },
        })
        .then((res) => {
          const readings = res.data as { timestamp: string }[];
          const days = new Set(readings.map((r) => new Date(r.timestamp).getDate()));
          setActiveDays(days);
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [username, currentDate.getFullYear(), currentDate.getMonth()]);

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === currentDate.getFullYear() &&
    today.getMonth() === currentDate.getMonth();

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Month Selector */}
      <div className="flex w-full h-6 text-center">
        <div className="flex-1 cursor-pointer select-none" onClick={handlePrevMonth}>
          {"<"}
        </div>
        <div className="flex-1">{monthYear}</div>
        <div className="flex-1 cursor-pointer select-none" onClick={handleNextMonth}>
          {">"}
        </div>
      </div>

      {/* Calendar Days */}
      <div className="w-full h-full mt-2 flex items-center justify-center">
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const hasData = activeDays.has(day);
            const isToday = isCurrentMonth && day === today.getDate();
            return (
              <div
                key={day}
                className={`flex justify-center items-center cursor-pointer border w-9 h-9 text-sm rounded
                  ${isToday ? "border-blue-400" : ""}
                  ${hasData ? "bg-green-700 text-white" : "bg-[#111111] opacity-50"}
                `}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Calendar;
