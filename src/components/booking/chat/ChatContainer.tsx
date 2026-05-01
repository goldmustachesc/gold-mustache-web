"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  children: ReactNode;
  className?: string;
}

export function ChatContainer({ children, className }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prev = prevScrollHeightRef.current;
    const grew = el.scrollHeight > prev;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const wasNearBottom = distanceFromBottom < 120;
    prevScrollHeightRef.current = el.scrollHeight;
    if (grew && wasNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  });

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex min-h-0 flex-col gap-4 overflow-y-auto scroll-smooth",
        "max-h-[calc(100vh-180px)]",
        "py-4 px-1",
        "[scrollbar-width:thin] [scrollbar-color:transparent_transparent]",
        "hover:[scrollbar-color:hsl(var(--foreground)/0.25)_transparent]",
        "[&::-webkit-scrollbar]:w-1.5",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full",
        "[&::-webkit-scrollbar-thumb]:bg-transparent",
        "hover:[&::-webkit-scrollbar-thumb]:bg-foreground/20",
        className,
      )}
    >
      {/* Limits upward drift so chat never floats above ~25% of the viewport. */}
      <div className="shrink grow-[0.25] basis-0" aria-hidden />
      {children}
    </div>
  );
}

// Input area at the bottom of chat
interface ChatInputAreaProps {
  children: ReactNode;
  className?: string;
}

export function ChatInputArea({ children, className }: ChatInputAreaProps) {
  return (
    <div
      className={cn(
        "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "p-4 rounded-b-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}
