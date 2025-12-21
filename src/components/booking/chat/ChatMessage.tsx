"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Scissors } from "lucide-react";
import type { ReactNode } from "react";

interface ChatMessageProps {
  children: ReactNode;
  variant: "bot" | "user";
  animate?: boolean;
  showAvatar?: boolean;
  className?: string;
}

export function ChatMessage({
  children,
  variant,
  animate = true,
  showAvatar = true,
  className,
}: ChatMessageProps) {
  const isBot = variant === "bot";

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[85%]",
        isBot ? "self-start" : "self-end flex-row-reverse",
        animate && "animate-in fade-in slide-in-from-bottom-2 duration-300",
        className,
      )}
    >
      {showAvatar && isBot && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src="/logo.png" alt="Gold Mustache" />
          <AvatarFallback className="bg-primary/10">
            <Scissors className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5",
          isBot
            ? "bg-muted text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm",
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface BotMessageProps {
  children: ReactNode;
  animate?: boolean;
  showAvatar?: boolean;
  className?: string;
}

export function BotMessage({
  children,
  animate = true,
  showAvatar = true,
  className,
}: BotMessageProps) {
  return (
    <ChatMessage
      variant="bot"
      animate={animate}
      showAvatar={showAvatar}
      className={className}
    >
      {children}
    </ChatMessage>
  );
}

interface UserMessageProps {
  children: ReactNode;
  animate?: boolean;
  className?: string;
}

export function UserMessage({
  children,
  animate = true,
  className,
}: UserMessageProps) {
  return (
    <ChatMessage
      variant="user"
      animate={animate}
      showAvatar={false}
      className={className}
    >
      {children}
    </ChatMessage>
  );
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <div className="flex gap-2 self-start animate-in fade-in duration-200">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary/10">
          <Scissors className="h-4 w-4 text-primary" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
