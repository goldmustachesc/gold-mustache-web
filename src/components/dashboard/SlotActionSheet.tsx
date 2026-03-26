"use client";

import { useState } from "react";
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
import { generateSubSlots } from "@/utils/time-slots";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const SUB_SLOT_INTERVAL_MINUTES = 15;

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
  timeOptions: string[];
  navigatingTime: string | null;
  onSelectTime: (time: string) => void;
  onCreateAbsence: (startTime: string, endTime: string) => void;
}

function SlotActionContent({
  slotStart,
  slotEnd,
  timeOptions,
  navigatingTime,
  onSelectTime,
  onCreateAbsence,
}: SlotActionContentProps) {
  const isNavigating = navigatingTime !== null;

  return (
    <div className="py-4 space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Início do atendimento
        </p>
        <div className="flex flex-wrap gap-2">
          {timeOptions.map((time) => (
            <Button
              key={time}
              variant="outline"
              size="sm"
              disabled={isNavigating}
              onClick={() => onSelectTime(time)}
              className={cn(
                "rounded-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary min-w-[60px] transition-opacity",
                navigatingTime === time && "opacity-70",
              )}
            >
              {navigatingTime === time ? (
                <Loader2
                  className="h-3 w-3 animate-spin"
                  data-testid="loading-spinner"
                />
              ) : (
                time
              )}
            </Button>
          ))}
        </div>
      </div>

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

  const timeOptions = generateSubSlots(
    slotStart,
    slotEnd,
    SUB_SLOT_INTERVAL_MINUTES,
  );

  const handleSelectTime = (time: string) => {
    setNavigatingTime(time);
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
    }
    onOpenChange(newOpen);
  };

  const title = `Adicionar em ${slotStart} - ${slotEnd}`;
  const description =
    "Escolha o início do atendimento ou bloqueie este intervalo.";

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <SlotActionContent
            slotStart={slotStart}
            slotEnd={slotEnd}
            timeOptions={timeOptions}
            navigatingTime={navigatingTime}
            onSelectTime={handleSelectTime}
            onCreateAbsence={handleCreateAbsence}
          />
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
        <SlotActionContent
          slotStart={slotStart}
          slotEnd={slotEnd}
          timeOptions={timeOptions}
          navigatingTime={navigatingTime}
          onSelectTime={handleSelectTime}
          onCreateAbsence={handleCreateAbsence}
        />
      </SheetContent>
    </Sheet>
  );
}
