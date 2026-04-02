import { render, screen } from "@testing-library/react";
import type { DehydratedState } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "../page";

const mockCreateClient = vi.hoisted(() => vi.fn());
const hydrationStates = vi.hoisted<Array<DehydratedState | undefined>>(
  () => [],
);
const prismaMocks = vi.hoisted(() => ({
  profileFindUnique: vi.fn(),
  profileCreate: vi.fn(),
  barberFindUnique: vi.fn(),
  appointmentFindMany: vi.fn(),
  workingHoursFindMany: vi.fn(),
  barberAbsenceFindMany: vi.fn(),
  barberCount: vi.fn(),
  profileCount: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => {
    throw new Error(
      "client navigation hooks should not be used in DashboardPage",
    );
  },
  usePathname: () => "/pt-BR/dashboard",
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => {
    throw new Error("useUser should not be used in DashboardPage");
  },
  useSignOut: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useBarberProfile", () => ({
  useBarberProfile: () => {
    throw new Error("useBarberProfile should not be used in DashboardPage");
  },
}));

vi.mock("@/components/dashboard/BarberDashboard", () => ({
  BarberDashboard: ({
    locale,
    barberProfile,
  }: {
    locale: string;
    barberProfile: { id: string; name: string };
  }) => (
    <div data-testid="barber-dashboard">
      BarberDashboard:{locale}:{barberProfile.id}:{barberProfile.name}
    </div>
  ),
}));

vi.mock("@/components/dashboard/ClientDashboard", () => ({
  ClientDashboard: ({ locale }: { locale: string }) => (
    <div data-testid="client-dashboard">ClientDashboard:{locale}</div>
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: (...args: unknown[]) =>
        prismaMocks.profileFindUnique(...args),
      create: (...args: unknown[]) => prismaMocks.profileCreate(...args),
      count: (...args: unknown[]) => prismaMocks.profileCount(...args),
    },
    barber: {
      findUnique: (...args: unknown[]) => prismaMocks.barberFindUnique(...args),
      count: (...args: unknown[]) => prismaMocks.barberCount(...args),
    },
    appointment: {
      findMany: (...args: unknown[]) =>
        prismaMocks.appointmentFindMany(...args),
    },
    workingHours: {
      findMany: (...args: unknown[]) =>
        prismaMocks.workingHoursFindMany(...args),
    },
    barberAbsence: {
      findMany: (...args: unknown[]) =>
        prismaMocks.barberAbsenceFindMany(...args),
    },
  },
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    HydrationBoundary: ({
      children,
      state,
    }: {
      children: ReactNode;
      state?: DehydratedState;
    }) => {
      hydrationStates.push(state);
      return <div data-testid="hydration-boundary">{children}</div>;
    },
  };
});

vi.mock("@/utils/time-slots", async () => {
  const actual =
    await vi.importActual<typeof import("@/utils/time-slots")>(
      "@/utils/time-slots",
    );

  return {
    ...actual,
    getBrazilDateString: () => "2026-03-19",
  };
});

describe("DashboardPage", () => {
  beforeEach(() => {
    hydrationStates.length = 0;
    vi.clearAllMocks();
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "cliente@goldmustache.com",
              user_metadata: {},
            },
          },
        }),
      },
    });
    prismaMocks.profileFindUnique.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      fullName: "João Silva",
      avatarUrl: null,
      phone: "47999998888",
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
      emailVerified: true,
      role: "CLIENT",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    prismaMocks.profileCreate.mockResolvedValue(null);
    prismaMocks.barberFindUnique.mockResolvedValue(null);
    prismaMocks.appointmentFindMany.mockResolvedValue([]);
    prismaMocks.workingHoursFindMany.mockResolvedValue([]);
    prismaMocks.barberAbsenceFindMany.mockResolvedValue([]);
    prismaMocks.barberCount.mockResolvedValue(0);
    prismaMocks.profileCount.mockResolvedValue(0);
  });

  it("renders ClientDashboard and hydrates client queries on the server", async () => {
    const ui = await DashboardPage({
      params: Promise.resolve({ locale: "pt-BR" }),
    });

    render(ui);

    expect(screen.getByTestId("client-dashboard")).toBeInTheDocument();
    expect(screen.getByText("ClientDashboard:pt-BR")).toBeInTheDocument();
    expect(screen.getByTestId("hydration-boundary")).toBeInTheDocument();

    const queryKeys = hydrationStates
      .flatMap((state) => state?.queries ?? [])
      .map((query) => query.queryKey);

    expect(queryKeys).toContainEqual(["profile-me", "user-1"]);
    expect(queryKeys).toContainEqual(["dashboard", "stats", true]);
  });

  it("renders BarberDashboard and hydrates barber queries on the server", async () => {
    prismaMocks.profileFindUnique.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      fullName: "Carlos Silva",
      avatarUrl: null,
      phone: "47999998888",
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
      emailVerified: true,
      role: "BARBER",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    prismaMocks.barberFindUnique.mockResolvedValue({
      id: "barber-1",
      userId: "user-1",
      name: "Carlos",
      avatarUrl: null,
      active: true,
    });

    const ui = await DashboardPage({
      params: Promise.resolve({ locale: "pt-BR" }),
    });

    render(ui);

    expect(screen.getByTestId("barber-dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("BarberDashboard:pt-BR:barber-1:Carlos"),
    ).toBeInTheDocument();

    const queryKeys = hydrationStates
      .flatMap((state) => state?.queries ?? [])
      .map((query) => query.queryKey);

    expect(queryKeys).toContainEqual(["barber-profile", "user-1"]);
    expect(queryKeys).toContainEqual(["my-working-hours"]);
    expect(queryKeys).toContainEqual([
      "appointments",
      "barber",
      "barber-1",
      "2026-03-15",
      "2026-03-21",
    ]);
    expect(queryKeys).toContainEqual([
      "barber-absences",
      "2026-03-15",
      "2026-03-21",
    ]);
  });
});
