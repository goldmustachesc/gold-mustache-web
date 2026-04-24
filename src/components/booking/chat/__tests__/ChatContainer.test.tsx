import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatContainer, ChatInputArea } from "../ChatContainer";

describe("ChatContainer", () => {
  it("renders children", () => {
    render(
      <ChatContainer>
        <p>Message 1</p>
        <p>Message 2</p>
      </ChatContainer>,
    );
    expect(screen.getByText("Message 1")).toBeInTheDocument();
    expect(screen.getByText("Message 2")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ChatContainer className="custom-class">
        <p>Content</p>
      </ChatContainer>,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders a flex spacer before children to bottom-align short threads", () => {
    const { container } = render(
      <ChatContainer>
        <p>Content</p>
      </ChatContainer>,
    );
    const root = container.firstElementChild;
    expect(root).toBeTruthy();
    const spacer = root?.firstElementChild;
    expect(spacer).toHaveAttribute("aria-hidden", "true");
    expect(spacer).toHaveClass("shrink");
  });
});

describe("ChatInputArea", () => {
  it("renders children", () => {
    render(
      <ChatInputArea>
        <input placeholder="Type here" />
      </ChatInputArea>,
    );
    expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ChatInputArea className="my-class">
        <p>Input</p>
      </ChatInputArea>,
    );
    expect(container.firstChild).toHaveClass("my-class");
  });
});
