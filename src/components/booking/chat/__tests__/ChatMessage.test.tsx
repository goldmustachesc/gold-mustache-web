import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ChatMessage,
  BotMessage,
  UserMessage,
  TypingIndicator,
} from "../ChatMessage";

describe("ChatMessage", () => {
  it("renders bot variant with avatar", () => {
    render(<ChatMessage variant="bot">Hello</ChatMessage>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByAltText("Gold Mustache")).toBeInTheDocument();
  });

  it("renders user variant without avatar", () => {
    render(<ChatMessage variant="user">My reply</ChatMessage>);
    expect(screen.getByText("My reply")).toBeInTheDocument();
    expect(screen.queryByAltText("Gold Mustache")).not.toBeInTheDocument();
  });

  it("hides avatar when showAvatar is false", () => {
    render(
      <ChatMessage variant="bot" showAvatar={false}>
        No avatar
      </ChatMessage>,
    );
    expect(screen.queryByAltText("Gold Mustache")).not.toBeInTheDocument();
  });
});

describe("BotMessage", () => {
  it("renders children as bot message", () => {
    render(<BotMessage>Bot says hi</BotMessage>);
    expect(screen.getByText("Bot says hi")).toBeInTheDocument();
  });
});

describe("UserMessage", () => {
  it("renders children as user message", () => {
    render(<UserMessage>User says hi</UserMessage>);
    expect(screen.getByText("User says hi")).toBeInTheDocument();
  });
});

describe("TypingIndicator", () => {
  it("renders three bounce dots", () => {
    const { container } = render(<TypingIndicator />);
    expect(container.querySelectorAll(".animate-bounce")).toHaveLength(3);
  });
});
