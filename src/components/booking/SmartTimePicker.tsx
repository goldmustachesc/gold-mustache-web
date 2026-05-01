"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  SmartTimeGroup,
  SmartTimeOption,
  SmartTimePickerViewModel,
} from "@/lib/booking/smart-time-picker";
import { cn } from "@/lib/utils";
import { Calendar, ChevronDown, Clock } from "lucide-react";

interface SmartTimePickerProps {
  model: SmartTimePickerViewModel;
  selectedStartTime: string;
  onSelectTime: (startTime: string) => void;
  onConfirm: (startTime: string) => void;
  onChooseAnotherDate?: () => void;
  showConfirmButton?: boolean;
  className?: string;
}

function getAllOptions(model: SmartTimePickerViewModel): SmartTimeOption[] {
  return [...model.recommendedOptions, ...model.additionalOptions];
}

function findSelectedOption(
  options: SmartTimeOption[],
  selectedStartTime: string,
): SmartTimeOption | null {
  return (
    options.find((option) => option.startTime === selectedStartTime) ?? null
  );
}

function TimeOptionButton({
  option,
  isSelected,
  onSelect,
}: {
  option: SmartTimeOption;
  isSelected: boolean;
  onSelect: (startTime: string) => void;
}) {
  return (
    <Button
      type="button"
      variant={isSelected ? "default" : "outline"}
      className={cn(
        "h-12 w-full px-2 text-sm font-semibold tabular-nums",
        option.quality === "poor" && !isSelected && "text-muted-foreground",
      )}
      onClick={() => onSelect(option.startTime)}
    >
      {option.startTime}
    </Button>
  );
}

function TimeGroupSection({
  group,
  selectedStartTime,
  onSelectTime,
}: {
  group: SmartTimeGroup;
  selectedStartTime: string;
  onSelectTime: (startTime: string) => void;
}) {
  return (
    <section className="space-y-2" aria-labelledby={`time-group-${group.id}`}>
      <h4
        id={`time-group-${group.id}`}
        className="text-sm font-semibold text-foreground"
      >
        {group.label}
      </h4>
      <div className="grid grid-cols-3 gap-3">
        {group.options.map((option) => (
          <TimeOptionButton
            key={option.startTime}
            option={option}
            isSelected={selectedStartTime === option.startTime}
            onSelect={onSelectTime}
          />
        ))}
      </div>
    </section>
  );
}

export function SmartTimePicker({
  model,
  selectedStartTime,
  onSelectTime,
  onConfirm,
  onChooseAnotherDate,
  showConfirmButton = true,
  className,
}: SmartTimePickerProps) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const allOptions = useMemo(() => getAllOptions(model), [model]);
  const selectedOption = findSelectedOption(allOptions, selectedStartTime);
  const recommendedGroup = model.groups.find(
    (group) => group.id === "recommended",
  );
  const additionalGroups = model.groups.filter(
    (group) => group.id !== "recommended",
  );

  useEffect(() => {
    if (selectedStartTime && !selectedOption) {
      onSelectTime("");
    }
  }, [onSelectTime, selectedOption, selectedStartTime]);

  if (model.emptyState) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-center">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              {model.emptyState.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {model.emptyState.message}
            </p>
          </div>
        </div>
        {model.emptyState.primaryAction === "choose_another_date" &&
          onChooseAnotherDate && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={onChooseAnotherDate}
            >
              <Calendar className="h-4 w-4" />
              Escolher outra data
            </Button>
          )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          Escolha um horário
        </h3>
      </div>

      {recommendedGroup && (
        <TimeGroupSection
          group={recommendedGroup}
          selectedStartTime={selectedStartTime}
          onSelectTime={onSelectTime}
        />
      )}

      {model.hasMoreOptions && (
        <div className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center gap-2"
            onClick={() => setShowMoreOptions((current) => !current)}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showMoreOptions && "rotate-180",
              )}
            />
            Ver mais horários ({model.additionalOptions.length})
          </Button>

          {showMoreOptions && (
            <div className="space-y-4">
              {additionalGroups.map((group) => (
                <TimeGroupSection
                  key={group.id}
                  group={group}
                  selectedStartTime={selectedStartTime}
                  onSelectTime={onSelectTime}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedOption && (
        <output
          aria-live="polite"
          className="block rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm font-medium text-foreground"
        >
          Atendimento: {selectedOption.startTime} - {selectedOption.endTime}
        </output>
      )}

      {showConfirmButton && (
        <Button
          type="button"
          className="w-full"
          disabled={!selectedOption}
          onClick={() => {
            if (selectedOption) {
              onConfirm(selectedOption.startTime);
            }
          }}
        >
          {selectedOption
            ? `Confirmar ${selectedOption.startTime}`
            : "Confirmar horário"}
        </Button>
      )}
    </div>
  );
}
