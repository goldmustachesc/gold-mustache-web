"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

interface LoadingElevatorProps {
  readonly open: boolean;
  readonly onAnimationComplete?: () => void;
}

const DOOR_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

export function LoadingElevator({
  open,
  onAnimationComplete,
}: Readonly<LoadingElevatorProps>) {
  const rightDoorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const door = rightDoorRef.current;
    if (!door || !open || !onAnimationComplete) return;

    const handler = () => onAnimationComplete();
    door.addEventListener("transitionend", handler, { once: true });
    return () => door.removeEventListener("transitionend", handler);
  }, [open, onAnimationComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 bg-[#0B0B0B]"
        style={{
          opacity: open ? 0 : 1,
          transition: "opacity 0.6s ease-in-out",
        }}
      />

      <div
        className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#D4AF37]"
        style={{
          transform: open ? "translateX(-100%)" : "translateX(0%)",
          transition: `transform 1s ${DOOR_EASE}`,
          boxShadow: "4px 0 32px rgba(212, 175, 55, 0.5)",
        }}
      />

      <div
        ref={rightDoorRef}
        className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#D4AF37] via-[#E5C158] to-[#D4AF37]"
        style={{
          transform: open ? "translateX(100%)" : "translateX(0%)",
          transition: `transform 1s ${DOOR_EASE}`,
          boxShadow: "-4px 0 32px rgba(212, 175, 55, 0.5)",
        }}
      />

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: open ? 0 : 1,
          transform: open ? "scale(0.8)" : "scale(1)",
          transition: "opacity 0.6s ease-in-out, transform 0.6s ease-in-out",
        }}
      >
        <div className="absolute w-56 h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 rounded-full bg-white/20 blur-3xl" />

        <div className="relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 z-10">
          <Image
            src="/logo.png"
            alt="Gold Mustache"
            fill
            className="object-contain"
            style={{
              filter:
                "drop-shadow(0 0 40px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.6))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
