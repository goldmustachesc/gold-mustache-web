import { authService } from "@/services/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSignOut } from "../useAuth";

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerMocks.replace,
    refresh: routerMocks.refresh,
  }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastMocks.success,
    error: toastMocks.error,
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function TestWrapper({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function SignOutHarness() {
  const { mutate: signOut, isPending } = useSignOut();

  return (
    <button type="button" onClick={() => signOut()} disabled={isPending}>
      Sair
    </button>
  );
}

describe("useSignOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("limpa cache de auth, remove queries antigas e redireciona no sucesso", async () => {
    vi.spyOn(authService, "signOut").mockResolvedValueOnce(undefined);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["user"], { id: "user-1" });
    queryClient.setQueryData(["session"], { access_token: "token" });
    queryClient.setQueryData(["appointments"], [{ id: "appointment-1" }]);

    const user = userEvent.setup();
    render(
      <TestWrapper queryClient={queryClient}>
        <SignOutHarness />
      </TestWrapper>,
    );

    await user.click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => {
      expect(authService.signOut).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(["user"])).toBeNull();
      expect(queryClient.getQueryData(["session"])).toBeNull();
    });

    expect(queryClient.getQueryData(["appointments"])).toBeUndefined();
    expect(toastMocks.success).toHaveBeenCalledWith("auth.toast.logoutSuccess");
    expect(routerMocks.replace).toHaveBeenCalledWith("/pt-BR");
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("mostra erro e mantém cache quando o signOut falha", async () => {
    vi.spyOn(authService, "signOut").mockRejectedValueOnce(new Error("falhou"));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["user"], { id: "user-1" });
    queryClient.setQueryData(["session"], { access_token: "token" });

    const user = userEvent.setup();
    render(
      <TestWrapper queryClient={queryClient}>
        <SignOutHarness />
      </TestWrapper>,
    );

    await user.click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => {
      expect(authService.signOut).toHaveBeenCalledTimes(1);
    });

    expect(queryClient.getQueryData(["user"])).toEqual({ id: "user-1" });
    expect(queryClient.getQueryData(["session"])).toEqual({
      access_token: "token",
    });
    expect(toastMocks.error).toHaveBeenCalledWith("auth.toast.logoutError");
    expect(routerMocks.replace).not.toHaveBeenCalled();
    expect(routerMocks.refresh).not.toHaveBeenCalled();
  });
});
