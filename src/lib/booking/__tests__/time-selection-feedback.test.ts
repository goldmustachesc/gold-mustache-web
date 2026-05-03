import { describe, expect, it } from "vitest";
import { buildTimeSelectionFeedback } from "../time-selection-feedback";

describe("buildTimeSelectionFeedback", () => {
  it("returns a valid selection with the full appointment range", () => {
    const feedback = buildTimeSelectionFeedback({
      windows: [{ startTime: "17:55", endTime: "18:45" }],
      selectedStartTime: "18:00",
      serviceDurationMinutes: 45,
    });

    expect(feedback.status).toBe("valid");
    expect(feedback.selectedStartTime).toBe("18:00");
    expect(feedback.selectedEndTime).toBe("18:45");
    expect(feedback.title).toBe("Horário disponível.");
    expect(feedback.message).toBe("Serviço de 45 min.");
    expect(feedback.detail).toBe("Atendimento previsto: 18:00 - 18:45.");
    expect(feedback.matchingWindow).toEqual({
      startTime: "17:55",
      endTime: "18:45",
    });
    expect(feedback.validStartTimes).toEqual(["17:55", "18:00"]);
    expect(feedback.visibleValidStartTimes).toEqual(["17:55", "18:00"]);
    expect(feedback.hiddenValidStartCount).toBe(0);
  });

  it("explains when the selected time fits the window but not the service duration", () => {
    const feedback = buildTimeSelectionFeedback({
      windows: [{ startTime: "17:55", endTime: "18:45" }],
      selectedStartTime: "18:35",
      serviceDurationMinutes: 45,
    });

    expect(feedback.status).toBe("service_does_not_fit");
    expect(feedback.selectedEndTime).toBe("19:20");
    expect(feedback.latestStartTimeInWindow).toBe("18:00");
    expect(feedback.suggestedStartTime).toBe("18:00");
    expect(feedback.actionLabel).toBe("Usar 18:00");
    expect(feedback.message).toContain("terminaria às 19:20");
    expect(feedback.detail).toBe("Último início possível: 18:00.");
  });

  it("suggests the next valid start when the selection is outside the windows", () => {
    const feedback = buildTimeSelectionFeedback({
      windows: [
        { startTime: "17:55", endTime: "18:45" },
        { startTime: "19:00", endTime: "20:00" },
      ],
      selectedStartTime: "18:50",
      serviceDurationMinutes: 30,
    });

    expect(feedback.status).toBe("outside_windows");
    expect(feedback.suggestedStartTime).toBe("19:00");
    expect(feedback.actionLabel).toBe("Usar 19:00");
    expect(feedback.message).toBe("Próximo início disponível: 19:00.");
  });

  it("rejects programmatic starts that are not aligned to the booking step", () => {
    const feedback = buildTimeSelectionFeedback({
      windows: [{ startTime: "09:00", endTime: "10:00" }],
      selectedStartTime: "09:17",
      serviceDurationMinutes: 30,
    });

    expect(feedback.status).toBe("outside_windows");
    expect(feedback.suggestedStartTime).toBe("09:20");
    expect(feedback.actionLabel).toBe("Usar 09:20");
    expect(feedback.message).toBe("Próximo início disponível: 09:20.");
  });

  it("suggests the next valid window when the service does not fit the current window", () => {
    const feedback = buildTimeSelectionFeedback({
      windows: [
        { startTime: "09:00", endTime: "09:20" },
        { startTime: "10:00", endTime: "11:00" },
      ],
      selectedStartTime: "09:10",
      serviceDurationMinutes: 30,
    });

    expect(feedback.status).toBe("service_does_not_fit");
    expect(feedback.latestStartTimeInWindow).toBeNull();
    expect(feedback.suggestedStartTime).toBe("10:00");
    expect(feedback.actionLabel).toBe("Usar 10:00");
    expect(feedback.detail).toBe("Próximo início disponível: 10:00.");
  });

  it("limits the visible valid start suggestions while keeping the selected time visible", () => {
    const feedback = buildTimeSelectionFeedback({
      windows: [{ startTime: "09:00", endTime: "10:00" }],
      selectedStartTime: "09:35",
      serviceDurationMinutes: 15,
    });

    expect(feedback.validStartTimes).toHaveLength(10);
    expect(feedback.visibleValidStartTimes).toHaveLength(6);
    expect(feedback.visibleValidStartTimes).toContain("09:35");
    expect(feedback.hiddenValidStartCount).toBe(4);
  });
});
