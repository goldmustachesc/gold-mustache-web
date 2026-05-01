import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { buildSmartTimePickerModel } from "@/lib/booking/smart-time-picker";
import type { SmartTimePickerViewModel } from "@/lib/booking/smart-time-picker";
import { SmartTimePicker } from "../SmartTimePicker";

function buildModel(): SmartTimePickerViewModel {
  return buildSmartTimePickerModel({
    windows: [{ startTime: "09:00", endTime: "21:00" }],
    serviceDurationMinutes: 60,
    maxRecommendedOptions: 2,
  });
}

function StatefulPicker({
  model = buildModel(),
  onConfirm = vi.fn(),
}: {
  model?: SmartTimePickerViewModel;
  onConfirm?: (startTime: string) => void;
}) {
  const [selectedStartTime, setSelectedStartTime] = useState("");

  return (
    <SmartTimePicker
      model={model}
      selectedStartTime={selectedStartTime}
      onSelectTime={setSelectedStartTime}
      onConfirm={onConfirm}
    />
  );
}

describe("SmartTimePicker", () => {
  it("shows recommended times first", () => {
    render(<StatefulPicker />);

    expect(screen.getByText("Escolha um horário")).toBeInTheDocument();
    expect(screen.getByText("Melhores horários")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "20:00" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "10:00" })).toBeNull();
  });

  it("confirms the selected time with the full appointment interval", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<StatefulPicker onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "09:00" }));

    expect(screen.getByText("Atendimento: 09:00 - 10:00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar 09:00" }));

    expect(onConfirm).toHaveBeenCalledWith("09:00");
  });

  it("keeps additional times hidden until the user expands them", async () => {
    const user = userEvent.setup();
    render(<StatefulPicker />);

    expect(screen.queryByRole("button", { name: "10:00" })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Ver mais horários/ }));

    expect(screen.getByText("Manhã")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument();
  });

  it("renders an actionable empty state", async () => {
    const user = userEvent.setup();
    const onChooseAnotherDate = vi.fn();
    const emptyModel = buildSmartTimePickerModel({
      windows: [],
      serviceDurationMinutes: 60,
    });

    render(
      <SmartTimePicker
        model={emptyModel}
        selectedStartTime=""
        onSelectTime={vi.fn()}
        onConfirm={vi.fn()}
        onChooseAnotherDate={onChooseAnotherDate}
      />,
    );

    expect(screen.getByText("Nenhum horário disponível")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Escolher outra data" }),
    );
    expect(onChooseAnotherDate).toHaveBeenCalledOnce();
  });

  it("clears the selection when the selected option disappears", () => {
    const onSelectTime = vi.fn();
    const nextModel = buildSmartTimePickerModel({
      windows: [{ startTime: "14:00", endTime: "15:00" }],
      serviceDurationMinutes: 60,
    });

    render(
      <SmartTimePicker
        model={nextModel}
        selectedStartTime="09:00"
        onSelectTime={onSelectTime}
        onConfirm={vi.fn()}
      />,
    );

    expect(onSelectTime).toHaveBeenCalledWith("");
  });
});
