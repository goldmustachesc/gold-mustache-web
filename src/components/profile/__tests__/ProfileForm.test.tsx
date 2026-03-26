import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ProfileForm } from "../ProfileForm";

const mockApiMutate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiMutate: mockApiMutate,
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastMocks.success, error: toastMocks.error },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/utils/masks", () => ({
  maskPhone: (v: string) => v.replace(/\D/g, "").slice(0, 11),
  maskZipCode: (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    return digits.length > 5
      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
      : digits;
  },
}));

let queryClient: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const MOCK_PROFILE = {
  id: "p-1",
  fullName: "João Silva",
  phone: "11999998888",
  street: "Rua A",
  number: "100",
  complement: "",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  zipCode: "01001000",
};

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProfileForm", () => {
  it("renders with initial profile data", () => {
    render(
      <Wrapper>
        <ProfileForm
          profile={MOCK_PROFILE as never}
          userEmail="test@test.com"
        />
      </Wrapper>,
    );

    expect(screen.getByLabelText(/fullName/i)).toHaveValue("João Silva");
    expect(screen.getByLabelText(/email/i)).toHaveValue("test@test.com");
  });

  it("renders empty form when no profile", () => {
    render(
      <Wrapper>
        <ProfileForm profile={undefined} userEmail="test@test.com" />
      </Wrapper>,
    );

    expect(screen.getByLabelText(/fullName/i)).toHaveValue("");
  });

  it("submits form and shows success toast", async () => {
    mockApiMutate.mockResolvedValue({});
    const user = userEvent.setup();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <Wrapper>
        <ProfileForm
          profile={MOCK_PROFILE as never}
          userEmail="test@test.com"
        />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button", { name: /save\.button/i }));

    await waitFor(() => {
      expect(mockApiMutate).toHaveBeenCalledWith(
        "/api/profile/me",
        "PUT",
        expect.objectContaining({ fullName: "João Silva" }),
      );
    });
    expect(toastMocks.success).toHaveBeenCalledWith("save.success");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["profile-me"],
    });
  });

  it("shows error toast on submit failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockApiMutate.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();

    render(
      <Wrapper>
        <ProfileForm
          profile={MOCK_PROFILE as never}
          userEmail="test@test.com"
        />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button", { name: /save\.button/i }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("save.error");
    });
  });

  it("fetches ViaCEP on zipCode blur and fills address fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            logradouro: "Rua Nova",
            bairro: "Vila Nova",
            localidade: "Campinas",
            uf: "SP",
          }),
      }),
    );
    const user = userEvent.setup();

    render(
      <Wrapper>
        <ProfileForm profile={undefined} userEmail="test@test.com" />
      </Wrapper>,
    );

    const zipInput = screen.getByLabelText(/zipCode/i);
    await user.clear(zipInput);
    await user.type(zipInput, "13015100");
    await user.tab();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("viacep.com.br"),
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/street/i)).toHaveValue("Rua Nova");
      expect(screen.getByLabelText(/city/i)).toHaveValue("Campinas");
    });
  });

  it("does not fetch ViaCEP for short zipCode", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();

    render(
      <Wrapper>
        <ProfileForm profile={undefined} userEmail="test@test.com" />
      </Wrapper>,
    );

    const zipInput = screen.getByLabelText(/zipCode/i);
    await user.type(zipInput, "130");
    await user.tab();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
