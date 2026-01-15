"use client";

import { cn } from "@/lib/utils";

interface MonthOption {
  month: number;
  year: number;
  label: string;
}

interface MonthSelectorProps {
  months: MonthOption[];
  selectedMonth: number;
  selectedYear: number;
  onSelect: (month: number, year: number) => void;
}

export function MonthSelector({
  months,
  selectedMonth,
  selectedYear,
  onSelect,
}: MonthSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {months.map((option) => {
        const isSelected =
          option.month === selectedMonth && option.year === selectedYear;

        return (
          <button
            key={`${option.year}-${option.month}`}
            type="button"
            onClick={() => onSelect(option.month, option.year)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
              isSelected
                ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-500/20"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700/50",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
