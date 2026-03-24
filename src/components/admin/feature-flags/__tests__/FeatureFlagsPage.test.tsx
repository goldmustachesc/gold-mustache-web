import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { FeatureFlagsPage } from "../FeatureFlagsPage";
import type { ResolvedFeatureFlag } from "@/services/feature-flags";

const mockPush = vi.fn();
const mockUseParams = vi.fn(() => ({ locale: "pt-BR" }));

const mockUseProfileMe = vi.hoisted(() =>
  vi.fn(() => ({
    data: { role: "ADMIN" as const },
    isLoading: false,
    error: null,
  })),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockUseParams(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => ({
    data: { id: "u1" },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => mockUseProfileMe(),
}));

const mockMutateAsync = vi.fn();

vi.mock("@/hooks/useAdminFeatureFlags", () => ({
  useAdminFeatureFlags: vi.fn(),
  useUpdateAdminFeatureFlags: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/components/private/PrivateHeaderContext", () => ({
  usePrivateHeader: vi.fn(),
  PrivateHeaderActions: ({ children }: { children: ReactNode }) => (
    <div data-testid="header-actions">{children}</div>
  ),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

import { useAdminFeatureFlags } from "@/hooks/useAdminFeatureFlags";

const baseFlags: ResolvedFeatureFlag[] = [
  {
    key: "loyaltyProgram",
    enabled: false,
    defaultValue: false,
    clientSafe: true,
    description: "Programa de fidelidade",
    category: "product",
    source: "default",
  },
  {
    key: "referralProgram",
    enabled: false,
    defaultValue: false,
    clientSafe: true,
    description: "Programa de indicação",
    category: "product",
    source: "default",
  },
  {
    key: "eventsSection",
    enabled: true,
    defaultValue: false,
    clientSafe: true,
    description: "Seção de eventos no site",
    category: "product",
    source: "database",
  },
];

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <FeatureFlagsPage />
    </QueryClientProvider>,
  );
}

describe("FeatureFlagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProfileMe.mockReturnValue({
      data: { role: "ADMIN" },
      isLoading: false,
      error: null,
    });
    vi.mocked(useAdminFeatureFlags).mockReturnValue({
      data: { flags: baseFlags },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as ReturnType<typeof useAdminFeatureFlags>);
  });

  it("renderiza lista de flags e contagem ativa", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: /feature flags/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 de 3 recursos ativos/i)).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /alternar programa de fidelidade/i }),
    ).toBeInTheDocument();
  });

  it("desabilita switch quando origem e env", () => {
    const flags: ResolvedFeatureFlag[] = [
      {
        key: "loyaltyProgram",
        enabled: true,
        defaultValue: false,
        clientSafe: true,
        description: "Programa de fidelidade",
        category: "product",
        source: "env",
      },
      ...baseFlags.slice(1),
    ];
    vi.mocked(useAdminFeatureFlags).mockReturnValue({
      data: { flags },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as ReturnType<typeof useAdminFeatureFlags>);

    renderPage();

    expect(
      screen.getByRole("switch", { name: /alternar programa de fidelidade/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/fixada por variável de ambiente/i),
    ).toBeInTheDocument();
  });

  it("salva apenas flags alteradas", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({ flags: baseFlags });

    renderPage();

    const loyaltySwitch = screen.getByRole("switch", {
      name: /alternar programa de fidelidade/i,
    });
    await user.click(loyaltySwitch);

    const saveBtn = screen.getByRole("button", { name: /salvar alterações/i });
    await user.click(saveBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      flags: { loyaltyProgram: true },
    });
  });

  it("exibe erro e tentar novamente quando a query de flags falha", async () => {
    const mockRefetch = vi.fn().mockResolvedValue({ data: undefined });
    vi.mocked(useAdminFeatureFlags).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Falha na rede"),
      refetch: mockRefetch,
    } as ReturnType<typeof useAdminFeatureFlags>);

    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole("heading", { name: /não foi possível carregar/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/falha na rede/i)).toBeInTheDocument();
    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("redireciona não-admin e exibe toast de acesso restrito", async () => {
    mockUseProfileMe.mockReturnValue({
      data: { role: "BARBER" },
      isLoading: false,
      error: null,
    });

    renderPage();

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Acesso restrito a administradores",
      );
      expect(mockPush).toHaveBeenCalledWith("/pt-BR/dashboard");
    });
  });
});
