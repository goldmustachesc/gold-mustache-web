"use client";

import { useEffect, useRef, useState } from "react";
import { getBrazilDateString, parseDateString } from "@/utils/time-slots";

const BRAZIL_TIMEZONE = "America/Sao_Paulo";

function getBrazilTodayDate(): Date {
  // Convert Brazil "YYYY-MM-DD" to a Date at local midnight for calendar usage
  return parseDateString(getBrazilDateString());
}

function getBrazilNowUtcTimestamp(): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = Number.parseInt(
    parts.find((p) => p.type === "year")?.value ?? "0",
    10,
  );
  const month = Number.parseInt(
    parts.find((p) => p.type === "month")?.value ?? "0",
    10,
  );
  const day = Number.parseInt(
    parts.find((p) => p.type === "day")?.value ?? "0",
    10,
  );
  const hours = Number.parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const minutes = Number.parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );
  const seconds = Number.parseInt(
    parts.find((p) => p.type === "second")?.value ?? "0",
    10,
  );

  return Date.UTC(year, month - 1, day, hours, minutes, seconds);
}

function msUntilNextBrazilMidnight(): number {
  const nowTs = getBrazilNowUtcTimestamp();
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = dateFormatter.formatToParts(now);
  const year = Number.parseInt(
    parts.find((p) => p.type === "year")?.value ?? "0",
    10,
  );
  const month = Number.parseInt(
    parts.find((p) => p.type === "month")?.value ?? "0",
    10,
  );
  const day = Number.parseInt(
    parts.find((p) => p.type === "day")?.value ?? "0",
    10,
  );

  const nextMidnightTs = Date.UTC(year, month - 1, day + 1, 0, 0, 1);
  return Math.max(1000, nextMidnightTs - nowTs);
}

/**
 * Returns "today" according to Brazil timezone and automatically updates after midnight.
 * This prevents stale "today" when a page stays open overnight.
 */
export function useBrazilToday(): Date {
  const [today, setToday] = useState<Date>(() => getBrazilTodayDate());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const schedule = () => {
      const delay = msUntilNextBrazilMidnight();
      timerRef.current = window.setTimeout(() => {
        setToday(getBrazilTodayDate());
        schedule();
      }, delay);
    };

    schedule();
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return today;
}
