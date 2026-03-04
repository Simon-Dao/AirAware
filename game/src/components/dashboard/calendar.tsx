import React, { useEffect, useState } from "react";

function Calendar() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const monthYear = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const handleNextMonth = () => {
    const next = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
    setCurrentDate(next);
  };

  const handlePrevMonth = () => {
    const prev = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
    setCurrentDate(prev);
  };

  // Get calendar days
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate(); // Last day of month

  const calendarDays = [];

  // Current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
    });
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Month Selector */}
      <div className="flex w-full h-6 text-center">
        <div
          className="flex-1 cursor-pointer select-none"
          onClick={handlePrevMonth}
        >
          {"<"}
        </div>
        <div className="flex-1 bg-red-300">{monthYear}</div>
        <div
          className="flex-1 cursor-pointer select-none"
          onClick={handleNextMonth}
        >
          {">"}
        </div>
      </div>

      {/* Calendar Days */}
      <div className="w-full h-full mt-2 flex items-center justify-center">
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((dayObj, i) => (
            <div
              key={i}
              className={`flex justify-center items-center cursor-pointer border w-9 h-9 text-sm rounded ${
                dayObj.isCurrentMonth ? "" : "opacity-50"
                + " " + 
                 "bg-[#111111]"
              }`}
            >
              {dayObj.day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Calendar;
