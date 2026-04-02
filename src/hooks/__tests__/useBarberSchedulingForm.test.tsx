import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  const user = { id: "user-1", email: "barber@test.com" };
  const barber = { id: "barber-1", name: "João", avatarUrl: null };
  return {
    push: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
    mutateAsync: vi.fn(),
    setPrivateHeader: vi.fn(),
    user,
    barber,
    services: [
      {
        id: "svc-1",
        name: "Corte",
        duration: 30,
        price: 50,
        slug: "corte",
        description: null,
        active: true,
      },
      {
        id: "svc-2",
        name: "Barba",
        duration: 20,
        price: 30,
        slug: "barba",
        description: null,
        active: true,
      },
    ],
    slots: {
      barberId: barber.id,
      serviceDuration: 30,
      windows: [
        { startTime: "09:00", endTime: "10:00" },
        { startTime: "10:30", endTime: "12:00" },
      ],
    },
    clients: {
      data: [
        {
          id: "cl-1",
          fullName: "Carlos Silva",
          phone: "11999887766",
          type: "registered" as const,
          appointmentCount: 5,
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    },
    state: {
      userLoading: false,
      barberLoading: false,
      servicesLoading: false,
      slotsLoading: false,
      slotsError: false,
      clientsLoading: false,
      userData: user as typeof user | undefined,
      barberData: barber as typeof barber | null,
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useParams: () => ({ locale: "pt-BR" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

vi.mock("@/components/private/PrivateHeaderContext", () => ({
  usePrivateHeader: mocks.setPrivateHeader,
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => ({
    data: mocks.state.userData,
    isLoading: mocks.state.userLoading,
  }),
}));

vi.mock("@/hooks/useBarberProfile", () => ({
  useBarberProfile: () => ({
    data: mocks.state.barberData,
    isLoading: mocks.state.barberLoading,
  }),
}));

vi.mock("@/hooks/useBooking", () => ({
  useServices: () => ({
    data: mocks.services,
    isLoading: mocks.state.servicesLoading,
  }),
  useBarberSlots: () => ({
    data: mocks.slots,
    isLoading: mocks.state.slotsLoading,
    isError: mocks.state.slotsError,
  }),
  useCreateAppointmentByBarber: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useBarberClients", () => ({
  useBarberClients: (search?: string) => ({
    data: search ? mocks.clients : undefined,
    isLoading: mocks.state.clientsLoading,
  }),
}));

import { useBarberSchedulingForm } from "../useBarberSchedulingForm";

let queryClient: QueryClient;

function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  mocks.slots = {
    barberId: mocks.barber.id,
    serviceDuration: 30,
    windows: [
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "10:30", endTime: "12:00" },
    ],
  };
  mocks.state.userData = mocks.user;
  mocks.state.barberData = mocks.barber;
  mocks.state.userLoading = false;
  mocks.state.barberLoading = false;
  mocks.state.servicesLoading = false;
  mocks.state.slotsLoading = false;
  mocks.state.slotsError = false;
  mocks.state.clientsLoading = false;
  mocks.mutateAsync.mockReset();
  mocks.push.mockReset();
  mocks.toastError.mockReset();
  mocks.toastSuccess.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useBarberSchedulingForm", () => {
  it("redireciona para login quando não há usuário autenticado", () => {
    mocks.state.userData = undefined;
    mocks.state.userLoading = false;

    renderHook(() => useBarberSchedulingForm(), {
      wrapper: createWrapper(),
    });

    expect(mocks.push).toHaveBeenCalledWith("/pt-BR/login");
  });

  it("bloqueia acesso quando o usuário não tem perfil de barbeiro", () => {
    mocks.state.barberData = null;

    renderHook(() => useBarberSchedulingForm(), {
      wrapper: createWrapper(),
    });

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Acesso restrito a barbeiros",
    );
    expect(mocks.push).toHaveBeenCalledWith("/pt-BR/dashboard");
  });

  it("limpa horário ao mudar data após o mount inicial", () => {
    const { result } = renderHook(() => useBarberSchedulingForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handlers.onTimeChange("09:30");
    });

    expect(result.current.formState.selectedTime).toBe("09:30");

    act(() => {
      result.current.handlers.onDateChange("2025-12-20");
    });

    expect(result.current.formState.selectedTime).toBe("");
  });

  describe("initialization", () => {
    it("initializes with empty form state", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      expect(result.current.formState.clientName).toBe("");
      expect(result.current.formState.clientPhone).toBe("");
      expect(result.current.formState.selectedServiceId).toBe("");
      expect(result.current.formState.selectedTime).toBe("");
    });

    it("exposes loading states", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBeDefined();
      expect(typeof result.current.loading.isInitializing).toBe("boolean");
      expect(typeof result.current.loading.services).toBe("boolean");
      expect(typeof result.current.loading.slots).toBe("boolean");
      expect(typeof result.current.loading.clients).toBe("boolean");
    });

    it("provides auth data", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      expect(result.current.auth.user).toEqual(mocks.user);
      expect(result.current.auth.barberProfile).toEqual(mocks.barber);
    });
  });

  describe("client management", () => {
    it("handles phone input change", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onPhoneChange("11999887766");
      });

      expect(result.current.formState.clientPhone).toBe("11999887766");
    });

    it("handles client selection", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onSelectClient(mocks.clients.data[0]);
      });

      expect(result.current.clientSearch.selectedClient).toEqual(
        mocks.clients.data[0],
      );
      expect(result.current.formState.clientName).toBe("Carlos Silva");
      expect(result.current.formState.clientPhone).toBe("11999887766");
      expect(result.current.clientSearch.showSuggestions).toBe(false);
    });

    it("handles clearing client selection", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onSelectClient(mocks.clients.data[0]);
      });

      act(() => {
        result.current.handlers.onClearSelection();
      });

      expect(result.current.clientSearch.selectedClient).toBeNull();
      expect(result.current.formState.clientName).toBe("");
      expect(result.current.formState.clientPhone).toBe("");
    });

    it("clears selected client when phone changes", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onSelectClient(mocks.clients.data[0]);
      });

      act(() => {
        result.current.handlers.onPhoneChange("1199");
      });

      expect(result.current.clientSearch.selectedClient).toBeNull();
      expect(result.current.formState.clientName).toBe("");
    });
  });

  describe("service selection", () => {
    it("updates selected service id", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onServiceChange("svc-1");
      });

      expect(result.current.formState.selectedServiceId).toBe("svc-1");
    });

    it("finds the selected service object", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onServiceChange("svc-1");
      });

      expect(result.current.computed.selectedService?.name).toBe("Corte");
    });
  });

  describe("time slot selection", () => {
    it("updates selected time", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onTimeChange("09:30");
      });

      expect(result.current.formState.selectedTime).toBe("09:30");
    });

    it("exposes the continuous availability windows", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      expect(result.current.computed.bookingAvailability).toEqual(mocks.slots);
    });
  });

  describe("computed values", () => {
    it("computes canSubmit as false when form is incomplete", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      expect(result.current.computed.canSubmit).toBe(false);
    });

    it("computes canSubmit as true when all fields are valid", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onNameChange("João Silva");
        result.current.handlers.onPhoneChange("11999887766");
        result.current.handlers.onServiceChange("svc-1");
        result.current.handlers.onDateChange("2025-12-15");
      });

      act(() => {
        result.current.handlers.onTimeChange("09:30");
      });

      expect(result.current.computed.canSubmit).toBe(true);
    });

    it("computes canSubmit as false when selected time does not fit the availability windows", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onNameChange("João Silva");
        result.current.handlers.onPhoneChange("11999887766");
        result.current.handlers.onServiceChange("svc-1");
        result.current.handlers.onDateChange("2025-12-15");
      });

      act(() => {
        result.current.handlers.onTimeChange("10:05");
      });

      expect(result.current.computed.selectedTimeError).toBe(
        "Escolha um horário dentro das janelas disponíveis.",
      );
      expect(result.current.computed.canSubmit).toBe(false);
    });

    it("computes completedSteps correctly", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      expect(result.current.computed.completedSteps).toBe(1);

      act(() => {
        result.current.handlers.onNameChange("João");
        result.current.handlers.onPhoneChange("11999887766");
      });

      expect(result.current.computed.completedSteps).toBe(3);
    });

    it("does not count an invalid selected time as a completed step", () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onNameChange("João Silva");
        result.current.handlers.onPhoneChange("11999887766");
        result.current.handlers.onServiceChange("svc-1");
        result.current.handlers.onDateChange("2025-12-15");
      });

      act(() => {
        result.current.handlers.onTimeChange("10:05");
      });

      expect(result.current.computed.selectedTimeError).toBe(
        "Escolha um horário dentro das janelas disponíveis.",
      );
      expect(result.current.computed.completedSteps).toBe(4);
    });

    it("blocks submit when the availability query fails for a selected time", () => {
      mocks.slots = undefined;
      mocks.state.slotsError = true;

      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onNameChange("João Silva");
        result.current.handlers.onPhoneChange("11999887766");
        result.current.handlers.onServiceChange("svc-1");
        result.current.handlers.onDateChange("2025-12-15");
      });

      act(() => {
        result.current.handlers.onTimeChange("09:30");
      });

      expect(result.current.computed.selectedTimeError).toBe(
        "Não foi possível carregar as janelas disponíveis para este serviço.",
      );
      expect(result.current.computed.canSubmit).toBe(false);
      expect(result.current.computed.completedSteps).toBe(4);
    });
  });

  describe("form submission", () => {
    function fillForm(result: {
      current: ReturnType<typeof useBarberSchedulingForm>;
    }) {
      act(() => {
        result.current.handlers.onNameChange("João Silva");
        result.current.handlers.onPhoneChange("11999887766");
        result.current.handlers.onServiceChange("svc-1");
        result.current.handlers.onDateChange("2025-12-15");
      });
      act(() => {
        result.current.handlers.onTimeChange("09:30");
      });
    }

    it("calls mutateAsync with correct payload on submit", async () => {
      mocks.mutateAsync.mockResolvedValue({});

      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      fillForm(result);

      await act(async () => {
        await result.current.handlers.onSubmit();
      });

      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        serviceId: "svc-1",
        date: "2025-12-15",
        startTime: "09:30",
        clientName: "João Silva",
        clientPhone: "11999887766",
      });
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Agendamento criado com sucesso!",
      );
    });

    it("mostra erro quando o nome do cliente é inválido", async () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onNameChange("A");
        result.current.handlers.onPhoneChange("11999887766");
        result.current.handlers.onServiceChange("svc-1");
        result.current.handlers.onDateChange("2025-12-15");
      });

      act(() => {
        result.current.handlers.onTimeChange("09:30");
      });

      await act(async () => {
        await result.current.handlers.onSubmit();
      });

      expect(mocks.toastError).toHaveBeenCalledWith(
        "Nome do cliente deve ter pelo menos 2 caracteres",
      );
      expect(mocks.mutateAsync).not.toHaveBeenCalled();
    });

    it("shows validation error when required fields are missing", async () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handlers.onSubmit();
      });

      expect(mocks.toastError).toHaveBeenCalled();
      expect(mocks.mutateAsync).not.toHaveBeenCalled();
    });

    it("blocks submit when the selected time is outside the availability windows", async () => {
      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.onNameChange("João Silva");
        result.current.handlers.onPhoneChange("11999887766");
        result.current.handlers.onServiceChange("svc-1");
        result.current.handlers.onDateChange("2025-12-15");
      });

      act(() => {
        result.current.handlers.onTimeChange("10:05");
      });

      await act(async () => {
        await result.current.handlers.onSubmit();
      });

      expect(mocks.toastError).toHaveBeenCalledWith(
        "Escolha um horário dentro das janelas disponíveis.",
      );
      expect(mocks.mutateAsync).not.toHaveBeenCalled();
    });

    it("shows error toast on mutation failure", async () => {
      mocks.mutateAsync.mockRejectedValue(new Error("Slot unavailable"));

      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      fillForm(result);

      await act(async () => {
        await result.current.handlers.onSubmit();
      });

      expect(mocks.toastError).toHaveBeenCalledWith("Slot unavailable");
    });

    it("usa mensagem genérica quando o erro não é instância de Error", async () => {
      mocks.mutateAsync.mockRejectedValue("falha-opaca");

      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      fillForm(result);

      await act(async () => {
        await result.current.handlers.onSubmit();
      });

      expect(mocks.toastError).toHaveBeenCalledWith(
        "Erro ao criar agendamento",
      );
    });

    it("resets form after successful submission", async () => {
      mocks.mutateAsync.mockResolvedValue({});

      const { result } = renderHook(() => useBarberSchedulingForm(), {
        wrapper: createWrapper(),
      });

      fillForm(result);

      await act(async () => {
        await result.current.handlers.onSubmit();
      });

      expect(result.current.formState.clientName).toBe("");
      expect(result.current.formState.clientPhone).toBe("");
      expect(result.current.formState.selectedServiceId).toBe("");
      expect(result.current.formState.selectedTime).toBe("");
    });
  });
});
