import { authService } from "@/services/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthError } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useResetPassword,
  useSession,
  useSignIn,
  useSignInWithGoogle,
  useSignOut,
  useSignUp,
  useUpdatePassword,
  useUser,
} from "../useAuth";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerMocks.push,
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

describe("useAuth queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carrega o usuario autenticado com useUser", async () => {
    vi.spyOn(authService, "getUser").mockResolvedValueOnce({
      id: "user-1",
      email: "user@test.com",
    } as never);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useUser(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(authService.getUser).toHaveBeenCalledTimes(1);
    expect(result.current.data).toMatchObject({
      id: "user-1",
      email: "user@test.com",
    });
  });

  it("carrega a sessao atual com useSession", async () => {
    vi.spyOn(authService, "getSession").mockResolvedValueOnce({
      access_token: "token-123",
    } as never);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(authService.getSession).toHaveBeenCalledTimes(1);
    expect(result.current.data).toMatchObject({
      access_token: "token-123",
    });
  });
});

describe("useSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalida caches e redireciona quando o login funciona", async () => {
    vi.spyOn(authService, "signIn").mockResolvedValueOnce({
      user: { id: "user-1" } as never,
      session: { access_token: "token-123" } as never,
      error: null,
    });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSignIn(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: "user@test.com",
        password: "senha123",
      });
    });

    expect(authService.signIn).toHaveBeenCalledWith(
      "user@test.com",
      "senha123",
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["user"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["session"] });
    expect(toastMocks.success).toHaveBeenCalledWith("auth.toast.loginSuccess");
    expect(routerMocks.push).toHaveBeenCalledWith("/pt-BR/dashboard");
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("continua o fluxo quando o erro e de email nao confirmado mas ja existe sessao", async () => {
    vi.spyOn(authService, "signIn").mockResolvedValueOnce({
      user: { id: "user-1" } as never,
      session: { access_token: "token-123" } as never,
      error: new AuthError("Email not confirmed", 400, "auth"),
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSignIn(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: "user@test.com",
        password: "senha123",
      });
    });

    expect(toastMocks.success).toHaveBeenCalledWith("auth.toast.loginSuccess");
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(routerMocks.push).toHaveBeenCalledWith("/pt-BR/dashboard");
  });

  it("silencia o erro de email nao confirmado quando nao ha sessao", async () => {
    vi.spyOn(authService, "signIn").mockResolvedValueOnce({
      user: null,
      session: null,
      error: new AuthError("Email not confirmed", 400, "auth"),
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSignIn(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: "user@test.com",
        password: "senha123",
      });
    });

    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("mostra o erro traduzido quando o servico retorna falha de login", async () => {
    vi.spyOn(authService, "signIn").mockResolvedValueOnce({
      user: null,
      session: null,
      error: new AuthError("Invalid login credentials", 400, "auth"),
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSignIn(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: "user@test.com",
        password: "senha123",
      });
    });

    expect(toastMocks.error).toHaveBeenCalledTimes(1);
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("mostra toast generico quando a mutation falha com excecao", async () => {
    vi.spyOn(authService, "signIn").mockRejectedValueOnce(new Error("boom"));

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSignIn(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          email: "user@test.com",
          password: "senha123",
        }),
      ).rejects.toThrow("boom");
    });

    expect(toastMocks.error).toHaveBeenCalledWith("auth.toast.loginError");
  });
});

describe("useSignUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalida cache e redireciona quando o cadastro funciona", async () => {
    vi.spyOn(authService, "signUp").mockResolvedValueOnce({
      user: { id: "user-1" } as never,
      session: { access_token: "token-123" } as never,
      error: null,
    });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSignUp(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: "user@test.com",
        password: "senha123",
        confirmPassword: "senha123",
        fullName: "User Test",
        phone: "11999999999",
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["user"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["session"] });
    expect(toastMocks.success).toHaveBeenCalledWith("auth.toast.signupSuccess");
    expect(routerMocks.push).toHaveBeenCalledWith("/pt-BR/dashboard");
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("mostra erro quando o servico retorna falha de cadastro", async () => {
    vi.spyOn(authService, "signUp").mockResolvedValueOnce({
      user: null,
      session: null,
      error: new AuthError("User already registered", 400, "auth"),
    });

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSignUp(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: "user@test.com",
        password: "senha123",
        confirmPassword: "senha123",
        fullName: "User Test",
        phone: "11999999999",
      });
    });

    expect(toastMocks.error).toHaveBeenCalledTimes(1);
    expect(routerMocks.push).not.toHaveBeenCalled();
  });
});

describe("other auth mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra erro quando o login com Google falha", async () => {
    vi.spyOn(authService, "signInWithGoogle").mockRejectedValueOnce(
      new Error("google failed"),
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSignInWithGoogle(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        "google failed",
      );
    });

    expect(toastMocks.error).toHaveBeenCalledWith("auth.toast.googleError");
  });

  it("mostra sucesso ao solicitar reset de senha", async () => {
    vi.spyOn(authService, "resetPassword").mockResolvedValueOnce(undefined);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useResetPassword(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync("user@test.com");
    });

    expect(toastMocks.success).toHaveBeenCalledWith("auth.toast.resetSuccess");
  });

  it("mostra erro quando o reset de senha falha", async () => {
    vi.spyOn(authService, "resetPassword").mockRejectedValueOnce(
      new Error("boom"),
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useResetPassword(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await expect(result.current.mutateAsync("user@test.com")).rejects.toThrow(
        "boom",
      );
    });

    expect(toastMocks.error).toHaveBeenCalledWith("auth.toast.resetError");
  });

  it("redireciona para login quando a atualizacao de senha funciona", async () => {
    vi.spyOn(authService, "updatePassword").mockResolvedValueOnce(undefined);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useUpdatePassword(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync("nova-senha-123");
    });

    expect(toastMocks.success).toHaveBeenCalledWith(
      "auth.toast.updatePasswordSuccess",
    );
    expect(routerMocks.push).toHaveBeenCalledWith("/pt-BR/login");
  });

  it("mostra erro quando a atualizacao de senha falha", async () => {
    vi.spyOn(authService, "updatePassword").mockRejectedValueOnce(
      new Error("boom"),
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useUpdatePassword(), {
      wrapper: ({ children }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      ),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync("nova-senha-123"),
      ).rejects.toThrow("boom");
    });

    expect(toastMocks.error).toHaveBeenCalledWith(
      "auth.toast.updatePasswordError",
    );
  });
});
