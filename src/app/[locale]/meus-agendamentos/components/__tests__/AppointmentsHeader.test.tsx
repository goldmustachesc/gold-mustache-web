import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppointmentsHeader } from "../AppointmentsHeader";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    <img {...props} src={props.src as string} alt={props.alt as string} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AppointmentsHeader", () => {
  const baseProps = {
    locale: "pt-BR",
    isLoading: false,
    user: null,
    onSignOut: vi.fn(),
    isSigningOut: false,
  };

  it("renders the page title", () => {
    render(<AppointmentsHeader {...baseProps} />);
    expect(screen.getAllByText("Meus Agendamentos").length).toBeGreaterThan(0);
  });

  it("renders a back link to homepage", () => {
    render(<AppointmentsHeader {...baseProps} />);
    const link = screen.getByRole("link", { name: /meus agendamentos/i });
    expect(link).toHaveAttribute("href", "/pt-BR");
  });

  it("renders the logo", () => {
    render(<AppointmentsHeader {...baseProps} />);
    expect(screen.getByAltText("Gold Mustache")).toBeInTheDocument();
  });

  it("shows loading skeleton when isLoading", () => {
    render(<AppointmentsHeader {...baseProps} isLoading />);
    expect(screen.getByTestId("auth-skeleton")).toBeInTheDocument();
  });

  it("shows login button when user is null and not loading", () => {
    render(<AppointmentsHeader {...baseProps} user={null} />);
    const loginLink = screen.getByRole("link", { name: /entrar/i });
    expect(loginLink).toHaveAttribute(
      "href",
      "/pt-BR/login?redirect=/pt-BR/meus-agendamentos",
    );
  });

  it("shows user email and logout button when authenticated", () => {
    render(
      <AppointmentsHeader
        {...baseProps}
        user={{ email: "test@example.com" }}
      />,
    );
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sair/i })).toBeInTheDocument();
  });

  it("calls onSignOut when logout button is clicked", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    render(
      <AppointmentsHeader
        {...baseProps}
        user={{ email: "test@example.com" }}
        onSignOut={onSignOut}
      />,
    );

    await user.click(screen.getByRole("button", { name: /sair/i }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("disables logout button when signing out", () => {
    render(
      <AppointmentsHeader
        {...baseProps}
        user={{ email: "test@example.com" }}
        isSigningOut
      />,
    );
    expect(screen.getByRole("button", { name: /sair/i })).toBeDisabled();
  });
});
