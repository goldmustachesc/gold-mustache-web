import type { AvailabilityWindow } from "@/types/booking";
import {
  BOOKING_START_TIME_STEP_MINUTES,
  minutesToTime,
  parseTimeToMinutes,
  roundMinutesUpToSlotBoundary,
} from "@/utils/time-slots";

export type SmartTimeQuality = "best" | "good" | "neutral" | "poor";

export type SmartTimeReason =
  | "window_start"
  | "window_end"
  | "keeps_large_remaining_window"
  | "creates_small_gap"
  | "splits_window_middle";

export interface SmartTimeOption {
  startTime: string;
  endTime: string;
  windowStartTime: string;
  windowEndTime: string;
  quality: SmartTimeQuality;
  score: number;
  reasons: SmartTimeReason[];
  isRecommended: boolean;
}

export interface SmartTimeGroup {
  id: "recommended" | "morning" | "afternoon" | "evening" | "additional";
  label: string;
  options: SmartTimeOption[];
}

export interface SmartTimeEmptyState {
  title: string;
  message: string;
  primaryAction: "choose_another_date" | "choose_another_barber" | null;
}

export interface SmartTimePickerViewModel {
  groups: SmartTimeGroup[];
  recommendedOptions: SmartTimeOption[];
  additionalOptions: SmartTimeOption[];
  totalAvailableCount: number;
  hasMoreOptions: boolean;
  emptyState: SmartTimeEmptyState | null;
}

export interface BuildSmartTimePickerModelParams {
  windows: AvailabilityWindow[];
  serviceDurationMinutes: number;
  stepMinutes?: number;
  maxRecommendedOptions?: number;
  minBookableGapMinutes?: number;
}

interface CandidateInput {
  startMinutes: number;
  endMinutes: number;
  windowStartMinutes: number;
  windowEndMinutes: number;
  minBookableGapMinutes: number;
}

function isValidMinute(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function pushReason(
  reasons: SmartTimeReason[],
  condition: boolean,
  reason: SmartTimeReason,
): void {
  if (condition) {
    reasons.push(reason);
  }
}

function getQuality(score: number): SmartTimeQuality {
  if (score >= 100) {
    return "best";
  }

  if (score >= 40) {
    return "good";
  }

  if (score >= 0) {
    return "neutral";
  }

  return "poor";
}

function scoreCandidate(input: CandidateInput): {
  score: number;
  quality: SmartTimeQuality;
  reasons: SmartTimeReason[];
} {
  const {
    startMinutes,
    endMinutes,
    windowStartMinutes,
    windowEndMinutes,
    minBookableGapMinutes,
  } = input;
  const gapBefore = startMinutes - windowStartMinutes;
  const gapAfter = windowEndMinutes - endMinutes;
  const reasons: SmartTimeReason[] = [];
  let score = 0;

  const startsAtWindowStart = gapBefore === 0;
  const endsAtWindowEnd = gapAfter === 0;
  const createsSmallGap =
    (gapBefore > 0 && gapBefore < minBookableGapMinutes) ||
    (gapAfter > 0 && gapAfter < minBookableGapMinutes);
  const splitsWindowMiddle = gapBefore > 0 && gapAfter > 0;

  if (startsAtWindowStart) {
    score += 60;
  }

  if (endsAtWindowEnd) {
    score += 60;
  }

  if (!startsAtWindowStart && gapBefore >= minBookableGapMinutes) {
    score += 5;
  }

  if (!endsAtWindowEnd && gapAfter >= minBookableGapMinutes) {
    score += 5;
  }

  if (createsSmallGap) {
    score -= 45;
  }

  if (splitsWindowMiddle) {
    score -= 15;
  }

  pushReason(reasons, startsAtWindowStart, "window_start");
  pushReason(reasons, endsAtWindowEnd, "window_end");
  pushReason(
    reasons,
    !startsAtWindowStart && gapBefore >= minBookableGapMinutes,
    "keeps_large_remaining_window",
  );
  pushReason(
    reasons,
    !endsAtWindowEnd && gapAfter >= minBookableGapMinutes,
    "keeps_large_remaining_window",
  );
  pushReason(reasons, createsSmallGap, "creates_small_gap");
  pushReason(reasons, splitsWindowMiddle, "splits_window_middle");

  return {
    score,
    quality: getQuality(score),
    reasons: Array.from(new Set(reasons)),
  };
}

function buildOptionsForWindow(params: {
  window: AvailabilityWindow;
  serviceDurationMinutes: number;
  displayStepMinutes: number;
  minBookableGapMinutes: number;
}): SmartTimeOption[] {
  const {
    window,
    serviceDurationMinutes,
    displayStepMinutes,
    minBookableGapMinutes,
  } = params;
  const windowStartMinutes = parseTimeToMinutes(window.startTime);
  const windowEndMinutes = parseTimeToMinutes(window.endTime);
  const firstStartMinutes = roundMinutesUpToSlotBoundary(
    windowStartMinutes,
    BOOKING_START_TIME_STEP_MINUTES,
  );

  if (
    !isValidMinute(windowStartMinutes) ||
    !isValidMinute(windowEndMinutes) ||
    firstStartMinutes === null ||
    windowEndMinutes <= windowStartMinutes
  ) {
    return [];
  }

  const options: SmartTimeOption[] = [];

  for (
    let startMinutes = firstStartMinutes;
    startMinutes + serviceDurationMinutes <= windowEndMinutes;
    startMinutes += displayStepMinutes
  ) {
    const endMinutes = startMinutes + serviceDurationMinutes;
    const scored = scoreCandidate({
      startMinutes,
      endMinutes,
      windowStartMinutes,
      windowEndMinutes,
      minBookableGapMinutes,
    });

    options.push({
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
      windowStartTime: window.startTime,
      windowEndTime: window.endTime,
      quality: scored.quality,
      score: scored.score,
      reasons: scored.reasons,
      isRecommended: false,
    });
  }

  return options;
}

function sortOptions(options: SmartTimeOption[]): SmartTimeOption[] {
  return [...options].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return (
      parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime)
    );
  });
}

function uniqueOptionsByStartTime(
  options: SmartTimeOption[],
): SmartTimeOption[] {
  const seen = new Set<string>();
  const uniqueOptions: SmartTimeOption[] = [];

  for (const option of options) {
    if (seen.has(option.startTime)) {
      continue;
    }

    seen.add(option.startTime);
    uniqueOptions.push(option);
  }

  return uniqueOptions;
}

function markRecommended(
  options: SmartTimeOption[],
  maxRecommendedOptions: number,
): {
  recommendedOptions: SmartTimeOption[];
  additionalOptions: SmartTimeOption[];
} {
  const sortedOptions = sortOptions(options);
  const preferredOptions = sortedOptions.filter(
    (option) => option.quality !== "poor",
  );
  const selectedOptions = (
    preferredOptions.length > 0 ? preferredOptions : sortedOptions
  ).slice(0, maxRecommendedOptions);
  const selectedTimes = new Set(
    selectedOptions.map((option) => option.startTime),
  );

  const recommendedOptions = selectedOptions.map((option) => ({
    ...option,
    isRecommended: true,
  }));
  const additionalOptions = sortedOptions
    .filter((option) => !selectedTimes.has(option.startTime))
    .map((option) => ({
      ...option,
      isRecommended: false,
    }));

  return {
    recommendedOptions,
    additionalOptions,
  };
}

function getPeriodGroup(
  option: SmartTimeOption,
): Pick<SmartTimeGroup, "id" | "label"> {
  const startMinutes = parseTimeToMinutes(option.startTime);

  if (startMinutes < 12 * 60) {
    return { id: "morning", label: "Manhã" };
  }

  if (startMinutes < 18 * 60) {
    return { id: "afternoon", label: "Tarde" };
  }

  return { id: "evening", label: "Noite" };
}

function buildGroups(params: {
  recommendedOptions: SmartTimeOption[];
  additionalOptions: SmartTimeOption[];
}): SmartTimeGroup[] {
  const { recommendedOptions, additionalOptions } = params;
  const groups: SmartTimeGroup[] = [];
  const chronologicalAdditionalOptions = [...additionalOptions].sort(
    (left, right) =>
      parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime),
  );

  if (recommendedOptions.length > 0) {
    groups.push({
      id: "recommended",
      label: "Melhores horários",
      options: recommendedOptions,
    });
  }

  for (const option of chronologicalAdditionalOptions) {
    const period = getPeriodGroup(option);
    const existingGroup = groups.find((group) => group.id === period.id);

    if (existingGroup) {
      existingGroup.options.push(option);
      continue;
    }

    groups.push({
      ...period,
      options: [option],
    });
  }

  return groups;
}

function buildEmptyState(): SmartTimeEmptyState {
  return {
    title: "Nenhum horário disponível",
    message: "Escolha outra data, barbeiro ou serviço para continuar.",
    primaryAction: "choose_another_date",
  };
}

export function buildSmartTimePickerModel(
  params: BuildSmartTimePickerModelParams,
): SmartTimePickerViewModel {
  const {
    windows,
    serviceDurationMinutes,
    stepMinutes = serviceDurationMinutes,
    maxRecommendedOptions = 6,
    minBookableGapMinutes = serviceDurationMinutes,
  } = params;

  const displayStepMinutes = stepMinutes;

  const allOptions = uniqueOptionsByStartTime(
    windows.flatMap((window) =>
      buildOptionsForWindow({
        window,
        serviceDurationMinutes,
        displayStepMinutes,
        minBookableGapMinutes,
      }),
    ),
  );

  if (allOptions.length === 0) {
    return {
      groups: [],
      recommendedOptions: [],
      additionalOptions: [],
      totalAvailableCount: 0,
      hasMoreOptions: false,
      emptyState: buildEmptyState(),
    };
  }

  const { recommendedOptions, additionalOptions } = markRecommended(
    allOptions,
    maxRecommendedOptions,
  );

  return {
    groups: buildGroups({ recommendedOptions, additionalOptions }),
    recommendedOptions,
    additionalOptions,
    totalAvailableCount: allOptions.length,
    hasMoreOptions: additionalOptions.length > 0,
    emptyState: null,
  };
}
