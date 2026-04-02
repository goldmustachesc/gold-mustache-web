"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { minutesToTime, parseTimeToMinutes } from "@/utils/time-slots";

export interface SlotActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotStart: string;
  slotEnd: string;
  onSelectTime: (time: string) => void;
  onCreateAbsence: (startTime: string, endTime: string) => void;
}

interface SlotActionContentProps {
  slotStart: string;
  slotEnd: string;
  selectedTime: string;
  navigatingTime: string | null;
  maxSelectableTime: string;
  onTimeChange: (time: string) => void;
  onSelectTime: (time: string) => void;
  onCreateAbsence: (startTime: string, endTime: string) => void;
}

function SlotActionContent({
  slotStart,
  slotEnd,
  selectedTime,
  navigatingTime,
  maxSelectableTime,
  onTimeChange,
  onSelectTime,
  onCreateAbsence,
}: SlotActionContentProps) {
  const isNavigating = navigatingTime !== null;
  const canUseTime =
    selectedTime.length > 0 &&
    selectedTime >= slotStart &&
    selectedTime <= maxSelectableTime;

  return (
    <div className="p-4 pt-0 space-y-4">
      <div>
        <Label htmlFor="slot-action-start-time">Horário de início</Label>
        <div className="mt-2 space-y-2">
          <Input
            id="slot-action-start-time"
            aria-label="Horário de início"
            type="time"
            step={60}
            min={slotStart}
            max={maxSelectableTime}
            disabled={isNavigating}
            value={selectedTime}
            onChange={(event) => onTimeChange(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Você pode escolher qualquer minuto entre {slotStart} e{" "}
            {maxSelectableTime}.
          </p>
        </div>
      </div>

      <Button
        disabled={isNavigating || !canUseTime}
        onClick={() => onSelectTime(selectedTime)}
        className={cn(
          "w-full",
          navigatingTime === "appointment" && "opacity-70",
        )}
      >
        {navigatingTime === "appointment" ? (
          <Loader2
            className="h-4 w-4 animate-spin"
            data-testid="loading-spinner"
          />
        ) : (
          "Usar horário"
        )}
      </Button>

      <Separator />

      <Button
        variant="ghost"
        disabled={isNavigating}
        className="w-full justify-start text-warning hover:text-warning hover:bg-warning/10"
        onClick={() => onCreateAbsence(slotStart, slotEnd)}
      >
        <CalendarOff className="h-4 w-4 mr-2" />
        Bloquear este intervalo
      </Button>
    </div>
  );
}

export function SlotActionSheet({
  open,
  onOpenChange,
  slotStart,
  slotEnd,
  onSelectTime,
  onCreateAbsence,
}: SlotActionSheetProps) {
  const isDesktop = useIsDesktop();
  const [navigatingTime, setNavigatingTime] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(slotStart);
  const maxSelectableTime = useMemo(() => {
    const endMinutes = parseTimeToMinutes(slotEnd);
    if (endMinutes <= parseTimeToMinutes(slotStart)) {
      return slotStart;
    }

    return minutesToTime(endMinutes - 1);
  }, [slotEnd, slotStart]);

  useEffect(() => {
    if (open) {
      setSelectedTime(slotStart);
      setNavigatingTime(null);
    }
  }, [open, slotStart]);

  const handleSelectTime = (time: string) => {
    setNavigatingTime("appointment");
    setTimeout(() => {
      onSelectTime(time);
      setNavigatingTime(null);
    }, 150);
  };

  const handleCreateAbsence = (startTime: string, endTime: string) => {
    setNavigatingTime("absence");
    setTimeout(() => {
      onCreateAbsence(startTime, endTime);
      setNavigatingTime(null);
    }, 150);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNavigatingTime(null);
      setSelectedTime(slotStart);
    }
    onOpenChange(newOpen);
  };

  const title = `Adicionar em ${slotStart} - ${slotEnd}`;
  const description =
    "Escolha o início do atendimento ou bloqueie este intervalo.";

  const content = (
    <SlotActionContent
      slotStart={slotStart}
      slotEnd={slotEnd}
      selectedTime={selectedTime}
      navigatingTime={navigatingTime}
      maxSelectableTime={maxSelectableTime}
      onTimeChange={setSelectedTime}
      onSelectTime={handleSelectTime}
      onCreateAbsence={handleCreateAbsence}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
