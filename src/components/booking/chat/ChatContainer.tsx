"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatContainerProps {
  children: ReactNode;
  className?: string;
}

export function ChatContainer({ children, className }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  });

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex flex-col gap-4 overflow-y-auto scroll-smooth",
        "min-h-[400px] max-h-[calc(100vh-200px)]",
        "p-4 rounded-lg",
        // Subtle chat background pattern
        "bg-gradient-to-b from-background to-muted/20",
        className,
      )}
    >
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
