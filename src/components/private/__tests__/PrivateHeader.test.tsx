import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrivateHeader } from "../PrivateHeader";
import {
  PrivateHeaderProvider,
  usePrivateHeader,
} from "../PrivateHeaderContext";
import type { ReactNode } from "react";

const mockUser = vi.hoisted(() => ({
  value: null as { id: string; email: string } | null,
}));
vi.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ data: mockUser.value }),
}));

const mockProfile = vi.hoisted(() => ({
  value: null as { role: string; fullName: string | null } | null,
}));
vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => ({ data: mockProfile.value }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt-BR/barbeiro",
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
}));

vi.mock("next/image", () => ({
  default: function MockImage({ alt, ...props }: Record<string, unknown>) {
    // biome-ignore lint/performance/noImgElement: test mock for next/image
    return <img alt={alt as string} {...props} />;
  },
}));

vi.mock("@/components/notifications/NotificationPanel", () => ({
  NotificationPanel: ({ userId }: { userId: string }) => (
    <div data-testid="notification-panel">{userId}</div>
  ),
}));

function ConfigSetter({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  usePrivateHeader({ title, backHref });
  return null;
}

function Wrapper({
  children,
  title = "Test Page",
  backHref,
}: {
  children: ReactNode;
  title?: string;
  backHref?: string;
}) {
  return (
    <PrivateHeaderProvider>
      <ConfigSetter title={title} backHref={backHref} />
      {children}
    </PrivateHeaderProvider>
  );
}

describe("PrivateHeader", () => {
  beforeEach(() => {
    mockUser.value = { id: "user-1", email: "joao@test.com" };
    mockProfile.value = { role: "BARBER", fullName: "João Silva" };
  });

  it("renders the page title", () => {
    render(
      <Wrapper title="Meus Horários">
        <PrivateHeader />
      </Wrapper>,
    );

    expect(screen.getByText("Meus Horários")).toBeInTheDocument();
  });

  it("renders the logo on desktop", () => {
    render(
      <Wrapper>
        <PrivateHeader />
      </Wrapper>,
    );

    expect(screen.getByAltText("Gold Mustache")).toBeInTheDocument();
  });

  it("renders notification panel when user exists", () => {
    render(
      <Wrapper>
        <PrivateHeader />
      </Wrapper>,
    );

    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
  });

  it("hides notification panel when no user", () => {
    mockUser.value = null;
    render(
      <Wrapper>
        <PrivateHeader />
      </Wrapper>,
    );

    expect(screen.queryByTestId("notification-panel")).not.toBeInTheDocument();
  });

  it("shows user first name", () => {
    render(
      <Wrapper>
        <PrivateHeader />
      </Wrapper>,
    );

    expect(screen.getByText("João")).toBeInTheDocument();
  });

  it("renders menu button", () => {
    render(
      <Wrapper>
        <PrivateHeader />
      </Wrapper>,
    );

    expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument();
  });

  it("renders back link when backHref is set", () => {
    render(
      <Wrapper backHref="/pt-BR/barbeiro">
        <PrivateHeader />
      </Wrapper>,
    );

    const backLink = screen.getByRole("link", { name: /voltar/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/pt-BR/barbeiro");
  });

  it("does not render back link when backHref is not set", () => {
    render(
      <Wrapper>
        <PrivateHeader />
      </Wrapper>,
    );

    expect(
      screen.queryByRole("link", { name: /voltar/i }),
    ).not.toBeInTheDocument();
  });
});
