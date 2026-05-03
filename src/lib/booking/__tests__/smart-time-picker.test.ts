import { describe, expect, it } from "vitest";
import { buildSmartTimePickerModel } from "../smart-time-picker";
import type { AvailabilityWindow } from "@/types/booking";

const windows: AvailabilityWindow[] = [
  { startTime: "09:00", endTime: "12:00" },
  { startTime: "14:00", endTime: "15:00" },
];

describe("buildSmartTimePickerModel", () => {
  it("defaults to stepping by the service duration", () => {
    const model = buildSmartTimePickerModel({
      windows: [{ startTime: "09:00", endTime: "12:00" }],
      serviceDurationMinutes: 45,
    });

    expect(model.totalAvailableCount).toBe(4);
    expect(
      [...model.recommendedOptions, ...model.additionalOptions]
        .map((option) => option.startTime)
        .sort(),
    ).toEqual(["09:00", "09:45", "10:30", "11:15"]);
  });

  it("still rounds the first start to the booking step boundary", () => {
    const model = buildSmartTimePickerModel({
      windows: [{ startTime: "09:17", endTime: "12:00" }],
      serviceDurationMinutes: 45,
    });
    const startTimes = [...model.recommendedOptions, ...model.additionalOptions]
      .map((option) => option.startTime)
      .sort();

    expect(startTimes).toContain("09:20");
    expect(startTimes).toEqual(["09:20", "10:05", "10:50"]);
  });

  it("returns only options that fit fully inside availability windows", () => {
    const model = buildSmartTimePickerModel({
      windows: [{ startTime: "09:00", endTime: "10:00" }],
      serviceDurationMinutes: 45,
      stepMinutes: 15,
    });

    expect(model.recommendedOptions.map((option) => option.startTime)).toEqual([
      "09:00",
      "09:15",
    ]);
    expect(model.totalAvailableCount).toBe(2);
    expect(
      model.recommendedOptions.every((option) => option.startTime !== "09:30"),
    ).toBe(true);
  });

  it("recommends window edges before middle starts", () => {
    const model = buildSmartTimePickerModel({
      windows: [{ startTime: "09:00", endTime: "12:00" }],
      serviceDurationMinutes: 60,
      stepMinutes: 60,
      maxRecommendedOptions: 3,
    });

    expect(model.recommendedOptions.map((option) => option.startTime)).toEqual([
      "09:00",
      "11:00",
    ]);
    expect(model.additionalOptions.map((option) => option.startTime)).toEqual([
      "10:00",
    ]);
    expect(model.recommendedOptions[0]?.reasons).toContain("window_start");
    expect(model.recommendedOptions[1]?.reasons).toContain("window_end");
  });

  it("penalizes options that create gaps smaller than the bookable gap", () => {
    const model = buildSmartTimePickerModel({
      windows: [{ startTime: "09:00", endTime: "11:30" }],
      serviceDurationMinutes: 60,
      stepMinutes: 30,
      minBookableGapMinutes: 60,
      maxRecommendedOptions: 4,
    });

    const poorOption = model.additionalOptions.find(
      (option) => option.startTime === "09:30",
    );

    expect(poorOption?.quality).toBe("poor");
    expect(poorOption?.reasons).toContain("creates_small_gap");
    expect(model.recommendedOptions.map((option) => option.startTime)).toEqual([
      "09:00",
      "10:30",
    ]);
  });

  it("sorts options by score and uses earliest start time as tie breaker", () => {
    const model = buildSmartTimePickerModel({
      windows,
      serviceDurationMinutes: 60,
      stepMinutes: 60,
      maxRecommendedOptions: 10,
    });

    expect(model.recommendedOptions.map((option) => option.startTime)).toEqual([
      "14:00",
      "09:00",
      "11:00",
    ]);
  });

  it("groups additional options by day period", () => {
    const model = buildSmartTimePickerModel({
      windows: [{ startTime: "09:00", endTime: "21:00" }],
      serviceDurationMinutes: 60,
      stepMinutes: 60,
      maxRecommendedOptions: 2,
    });

    expect(model.hasMoreOptions).toBe(true);
    expect(model.groups.map((group) => group.id)).toEqual([
      "recommended",
      "morning",
      "afternoon",
      "evening",
    ]);
  });

  it("keeps additional period groups in chronological order", () => {
    const model = buildSmartTimePickerModel({
      windows: [{ startTime: "13:00", endTime: "18:45" }],
      serviceDurationMinutes: 60,
      stepMinutes: 5,
      maxRecommendedOptions: 2,
    });

    const afternoonGroup = model.groups.find(
      (group) => group.id === "afternoon",
    );

    expect(
      afternoonGroup?.options.slice(0, 6).map((option) => option.startTime),
    ).toEqual(["13:05", "13:10", "13:15", "13:20", "13:25", "13:30"]);
  });

  it("returns an actionable empty state when there are no available options", () => {
    const model = buildSmartTimePickerModel({
      windows: [{ startTime: "09:00", endTime: "09:30" }],
      serviceDurationMinutes: 60,
      stepMinutes: 15,
    });

    expect(model.totalAvailableCount).toBe(0);
    expect(model.recommendedOptions).toEqual([]);
    expect(model.emptyState).toEqual({
      title: "Nenhum horário disponível",
      message: "Escolha outra data, barbeiro ou serviço para continuar.",
      primaryAction: "choose_another_date",
    });
  });
});
