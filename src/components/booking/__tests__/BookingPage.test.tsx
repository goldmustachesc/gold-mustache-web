import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, afterEach } from "vitest";
import { toast } from "sonner";
import { BookingPage } from "../BookingPage";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ data: null }),
}));

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyInSaoPaulo: vi.fn().mockReturnValue("10/03/2026"),
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
}));

vi.mock("@/utils/time-slots", () => ({
  BOOKING_START_TIME_STEP_MINUTES: 5,
  formatDateToString: vi.fn().mockReturnValue("2026-03-10"),
  minutesToTime: (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  },
  parseTimeToMinutes: (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  },
  roundMinutesUpToSlotBoundary: (minutes: number) => minutes,
  roundTimeUpToSlotBoundary: (time: string) => time,
}));

vi.mock("@/hooks/useBrazilToday", () => ({
  useBrazilToday: () => new Date(2026, 2, 5),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/guest-session", () => ({
  getGuestToken: vi.fn().mockReturnValue(null),
  setGuestToken: vi.fn(),
  clearGuestToken: vi.fn(),
}));

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
    }),
  );
}

function stubFetchByUrl(
  barbers: unknown,
  services: unknown,
  slots: unknown,
  options?: { createGuestFails?: boolean },
) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const isPost = (init?.method ?? "GET") === "POST";
        if (isPost && url.includes("appointments/guest")) {
          if (options?.createGuestFails) {
            return Promise.resolve({
              ok: false,
              json: () =>
                Promise.resolve({
                  error: "SLOT_UNAVAILABLE",
                  message:
                    "Este horário não está disponível. Por favor, escolha outro.",
                }),
            });
          }
        }
        const data = url.includes("services")
          ? services
          : url.includes("slots")
            ? slots
            : barbers;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data }),
        });
      }),
  );
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("BookingPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders barber selection step initially", async () => {
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Escolha o Barbeiro")).toBeInTheDocument();
    });
  });

  it("renders barbers from API", async () => {
    stubFetch([
      { id: "b-1", name: "Carlos", avatarUrl: null },
      { id: "b-2", name: "João", avatarUrl: null },
    ]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
      expect(screen.getByText("João")).toBeInTheDocument();
    });
  });

  it("advances to service step when barber is selected", async () => {
    const user = userEvent.setup();
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
    });

    stubFetch([
      {
        id: "s-1",
        slug: "corte",
        name: "Corte",
        description: null,
        duration: 30,
        price: 50,
        active: true,
      },
    ]);

    await user.click(screen.getByText("Carlos"));

    await waitFor(() => {
      expect(screen.getByText("Escolha o Serviço")).toBeInTheDocument();
    });
  });

  it("shows back button on service step", async () => {
    const user = userEvent.setup();
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
    });

    stubFetch([]);
    await user.click(screen.getByText("Carlos"));

    await waitFor(() => {
      expect(screen.getByText("Voltar")).toBeInTheDocument();
    });
  });

  it("includes info step for guest users", async () => {
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Escolha o Barbeiro")).toBeInTheDocument();
    });
  });

  it("renders date picker step when advancing from service", async () => {
    const user = userEvent.setup();
    stubFetch([{ id: "b-1", name: "Carlos", avatarUrl: null }]);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
    });

    stubFetch([
      {
        id: "s-1",
        slug: "corte",
        name: "Corte",
        description: null,
        duration: 30,
        price: 50,
        active: true,
      },
    ]);
    await user.click(screen.getByText("Carlos"));

    await waitFor(() => {
      expect(screen.getByText("Escolha o Serviço")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Corte"));

    await waitFor(() => {
      expect(screen.getByText("Escolha a Data")).toBeInTheDocument();
      expect(screen.getByText("Março 2026")).toBeInTheDocument();
    });
  });

  it("advances to review step when guest submits info", async () => {
    const user = userEvent.setup();
    const barbers = [{ id: "b-1", name: "Carlos", avatarUrl: null }];
    const services = [
      {
        id: "s-1",
        slug: "corte",
        name: "Corte",
        description: null,
        duration: 30,
        price: 50,
        active: true,
      },
    ];
    const availability = {
      barberId: "b-1",
      serviceDuration: 30,
      windows: [{ startTime: "10:00", endTime: "12:00" }],
    };
    stubFetchByUrl(barbers, services, availability);

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Carlos"));

    await waitFor(() => {
      expect(screen.getByText("Corte")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Corte"));

    await waitFor(() => {
      expect(screen.getByText("Escolha a Data")).toBeInTheDocument();
    });
    await user.click(screen.getByText("10"));

    await waitFor(() => {
      expect(screen.getByText("Escolha o Horário")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Escolha o início exato"), {
      target: { value: "10:00" },
    });
    await user.click(
      screen.getByRole("button", { name: "Confirmar 10:00 - 10:30" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Continuar" }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(screen.getByText("Seus Dados")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("Seu nome completo"),
      "João Silva",
    );
    await user.type(
      screen.getByPlaceholderText("(11) 99999-9999"),
      "11999999999",
    );
    await user.click(
      screen.getByRole("button", { name: "Revisar Agendamento" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Confirmar Agendamento" }),
      ).toBeInTheDocument();
    });
  });

  it("shows toast.error when guest booking confirmation fails", async () => {
    const user = userEvent.setup();
    const barbers = [{ id: "b-1", name: "Carlos", avatarUrl: null }];
    const services = [
      {
        id: "s-1",
        slug: "corte",
        name: "Corte",
        description: null,
        duration: 30,
        price: 50,
        active: true,
      },
    ];
    const availability = {
      barberId: "b-1",
      serviceDuration: 30,
      windows: [{ startTime: "10:00", endTime: "12:00" }],
    };
    stubFetchByUrl(barbers, services, availability, { createGuestFails: true });

    render(<BookingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Carlos"));

    await waitFor(() => {
      expect(screen.getByText("Corte")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Corte"));

    await waitFor(() => {
      expect(screen.getByText("Escolha a Data")).toBeInTheDocument();
    });
    await user.click(screen.getByText("10"));

    await waitFor(() => {
      expect(screen.getByText("Escolha o Horário")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Escolha o início exato"), {
      target: { value: "10:00" },
    });
    await user.click(
      screen.getByRole("button", { name: "Confirmar 10:00 - 10:30" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Continuar" }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(screen.getByText("Seus Dados")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("Seu nome completo"),
      "João Silva",
    );
    await user.type(
      screen.getByPlaceholderText("(11) 99999-9999"),
      "11999999999",
    );
    await user.click(
      screen.getByRole("button", { name: "Revisar Agendamento" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Confirmar Agendamento" }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: "Confirmar Agendamento" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Este horário não está disponível. Por favor, escolha outro.",
      );
    });
  });
});
