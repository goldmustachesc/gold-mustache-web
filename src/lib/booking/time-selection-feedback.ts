import type { AvailabilityWindow } from "@/types/booking";
import {
  BOOKING_START_TIME_STEP_MINUTES,
  minutesToTime,
  parseTimeToMinutes,
  roundMinutesUpToSlotBoundary,
} from "@/utils/time-slots";

export type TimeSelectionStatus =
  | "empty"
  | "valid"
  | "outside_windows"
  | "service_does_not_fit";

export interface TimeSelectionFeedback {
  status: TimeSelectionStatus;
  selectedStartTime: string | null;
  selectedEndTime: string | null;
  serviceDurationMinutes: number;
  matchingWindow: AvailabilityWindow | null;
  validStartTimes: string[];
  visibleValidStartTimes: string[];
  hiddenValidStartCount: number;
  suggestedStartTime: string | null;
  latestStartTimeInWindow: string | null;
  title: string;
  message: string | null;
  detail: string | null;
  actionLabel: string | null;
}

export interface BuildTimeSelectionFeedbackParams {
  windows: AvailabilityWindow[];
  selectedStartTime: string;
  serviceDurationMinutes: number;
  stepMinutes?: number;
  maxVisibleSuggestions?: number;
}

function isFiniteMinutes(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

function buildValidStartTimesForWindow(
  window: AvailabilityWindow,
  serviceDurationMinutes: number,
  stepMinutes: number,
): string[] {
  const startMinutes = parseTimeToMinutes(window.startTime);
  const endMinutes = parseTimeToMinutes(window.endTime);
  const roundedStartMinutes = roundMinutesUpToSlotBoundary(
    startMinutes,
    stepMinutes,
  );

  if (
    !isFiniteMinutes(startMinutes) ||
    !isFiniteMinutes(endMinutes) ||
    roundedStartMinutes === null
  ) {
    return [];
  }

  const validStartTimes: string[] = [];

  for (
    let currentMinutes = roundedStartMinutes;
    currentMinutes + serviceDurationMinutes <= endMinutes;
    currentMinutes += stepMinutes
  ) {
    validStartTimes.push(minutesToTime(currentMinutes));
  }

  return validStartTimes;
}

function getVisibleValidStartTimes(params: {
  validStartTimes: string[];
  selectedStartTime: string;
  maxVisibleSuggestions: number;
}): string[] {
  const { validStartTimes, selectedStartTime, maxVisibleSuggestions } = params;

  if (validStartTimes.length <= maxVisibleSuggestions) {
    return validStartTimes;
  }

  const selectedIndex = validStartTimes.indexOf(selectedStartTime);

  if (selectedIndex === -1) {
    return validStartTimes.slice(0, maxVisibleSuggestions);
  }

  const half = Math.floor(maxVisibleSuggestions / 2);
  const start = Math.max(
    0,
    Math.min(
      selectedIndex - half,
      validStartTimes.length - maxVisibleSuggestions,
    ),
  );

  return validStartTimes.slice(start, start + maxVisibleSuggestions);
}

function findNextValidStartTime(
  validStartTimes: string[],
  selectedStartMinutes: number,
): string | null {
  return (
    validStartTimes.find(
      (time) => parseTimeToMinutes(time) >= selectedStartMinutes,
    ) ?? null
  );
}

export function buildTimeSelectionFeedback(
  params: BuildTimeSelectionFeedbackParams,
): TimeSelectionFeedback {
  const {
    windows,
    selectedStartTime,
    serviceDurationMinutes,
    stepMinutes = BOOKING_START_TIME_STEP_MINUTES,
    maxVisibleSuggestions = 6,
  } = params;

  if (!selectedStartTime) {
    return {
      status: "empty",
      selectedStartTime: null,
      selectedEndTime: null,
      serviceDurationMinutes,
      matchingWindow: null,
      validStartTimes: [],
      visibleValidStartTimes: [],
      hiddenValidStartCount: 0,
      suggestedStartTime: null,
      latestStartTimeInWindow: null,
      title: "",
      message: null,
      detail: null,
      actionLabel: null,
    };
  }

  const selectedStartMinutes = parseTimeToMinutes(selectedStartTime);
  if (!isFiniteMinutes(selectedStartMinutes)) {
    return {
      status: "empty",
      selectedStartTime: null,
      selectedEndTime: null,
      serviceDurationMinutes,
      matchingWindow: null,
      validStartTimes: [],
      visibleValidStartTimes: [],
      hiddenValidStartCount: 0,
      suggestedStartTime: null,
      latestStartTimeInWindow: null,
      title: "",
      message: null,
      detail: null,
      actionLabel: null,
    };
  }

  const selectedEndTime = minutesToTime(
    selectedStartMinutes + serviceDurationMinutes,
  );

  const validStartTimes = windows.flatMap((window) =>
    buildValidStartTimesForWindow(window, serviceDurationMinutes, stepMinutes),
  );
  const visibleValidStartTimes = getVisibleValidStartTimes({
    validStartTimes,
    selectedStartTime,
    maxVisibleSuggestions,
  });
  const hiddenValidStartCount =
    validStartTimes.length - visibleValidStartTimes.length;
  const nextValidStartTime = findNextValidStartTime(
    validStartTimes,
    selectedStartMinutes,
  );
  const roundedSelectedStartMinutes = roundMinutesUpToSlotBoundary(
    selectedStartMinutes,
    stepMinutes,
  );

  if (
    roundedSelectedStartMinutes === null ||
    roundedSelectedStartMinutes !== selectedStartMinutes
  ) {
    return {
      status: "outside_windows",
      selectedStartTime,
      selectedEndTime,
      serviceDurationMinutes,
      matchingWindow: null,
      validStartTimes,
      visibleValidStartTimes,
      hiddenValidStartCount,
      suggestedStartTime: nextValidStartTime,
      latestStartTimeInWindow: null,
      title: "Esse início não respeita os intervalos permitidos.",
      message: nextValidStartTime
        ? `Próximo início disponível: ${nextValidStartTime}.`
        : "Não há outro início disponível nesta data.",
      detail: "Escolha outra janela, data ou serviço.",
      actionLabel: nextValidStartTime ? `Usar ${nextValidStartTime}` : null,
    };
  }

  const matchingWindow =
    windows.find((window) => {
      const windowStartMinutes = parseTimeToMinutes(window.startTime);
      const windowEndMinutes = parseTimeToMinutes(window.endTime);

      return (
        selectedStartMinutes >= windowStartMinutes &&
        selectedStartMinutes < windowEndMinutes
      );
    }) ?? null;

  if (!matchingWindow) {
    return {
      status: "outside_windows",
      selectedStartTime,
      selectedEndTime,
      serviceDurationMinutes,
      matchingWindow: null,
      validStartTimes,
      visibleValidStartTimes,
      hiddenValidStartCount,
      suggestedStartTime: nextValidStartTime,
      latestStartTimeInWindow: null,
      title: "Esse início não está dentro de uma janela livre.",
      message: nextValidStartTime
        ? `Próximo início disponível: ${nextValidStartTime}.`
        : "Não há outro início disponível nesta data.",
      detail: "Escolha outra janela, data ou serviço.",
      actionLabel: nextValidStartTime ? `Usar ${nextValidStartTime}` : null,
    };
  }

  const matchingWindowValidStartTimes = buildValidStartTimesForWindow(
    matchingWindow,
    serviceDurationMinutes,
    stepMinutes,
  );
  const latestStartTimeInWindow = matchingWindowValidStartTimes.at(-1) ?? null;
  const windowEndMinutes = parseTimeToMinutes(matchingWindow.endTime);

  if (selectedStartMinutes + serviceDurationMinutes > windowEndMinutes) {
    const suggestedStartTime = latestStartTimeInWindow ?? nextValidStartTime;
    const detail = latestStartTimeInWindow
      ? `Último início possível: ${latestStartTimeInWindow}.`
      : nextValidStartTime
        ? `Próximo início disponível: ${nextValidStartTime}.`
        : "Escolha outra janela, data ou serviço.";

    return {
      status: "service_does_not_fit",
      selectedStartTime,
      selectedEndTime,
      serviceDurationMinutes,
      matchingWindow,
      validStartTimes,
      visibleValidStartTimes,
      hiddenValidStartCount,
      suggestedStartTime,
      latestStartTimeInWindow,
      title: `Esse serviço dura ${serviceDurationMinutes} min.`,
      message: `Começando às ${selectedStartTime}, ele terminaria às ${selectedEndTime}, mas a janela termina às ${matchingWindow.endTime}.`,
      detail,
      actionLabel: suggestedStartTime ? `Usar ${suggestedStartTime}` : null,
    };
  }

  return {
    status: "valid",
    selectedStartTime,
    selectedEndTime,
    serviceDurationMinutes,
    matchingWindow,
    validStartTimes,
    visibleValidStartTimes,
    hiddenValidStartCount,
    suggestedStartTime: selectedStartTime,
    latestStartTimeInWindow,
    title: "Horário disponível.",
    message: `Serviço de ${serviceDurationMinutes} min.`,
    detail: `Atendimento previsto: ${formatTimeRange(
      selectedStartTime,
      selectedEndTime,
    )}.`,
    actionLabel: null,
  };
}
