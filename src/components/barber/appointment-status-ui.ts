import type { AppointmentStatus } from "@prisma/client";

type DashboardStatusUi = {
  label: string;
  badgeClassName: string;
  surfaceClassName: string;
  actionClassName?: string;
};

const DASHBOARD_STATUS_UI: Partial<
  Record<AppointmentStatus, DashboardStatusUi>
> = {
  COMPLETED: {
    label: "Concluído",
    badgeClassName: "border-success/30 bg-success/15 text-foreground",
    surfaceClassName: "border-success/30 bg-success/10 hover:bg-success/15",
    actionClassName:
      "border-success/30 bg-success/10 text-foreground hover:bg-success/15 hover:text-foreground",
  },
  NO_SHOW: {
    label: "Não compareceu",
    badgeClassName: "border-warning bg-warning text-warning-foreground",
    surfaceClassName: "border-warning/30 bg-warning/10 hover:bg-warning/15",
    actionClassName:
      "border-warning/30 bg-warning/10 text-foreground hover:bg-warning/15 hover:text-foreground",
  },
  CANCELLED_BY_CLIENT: {
    label: "Cancelado",
    badgeClassName: "border-transparent bg-destructive text-white",
    surfaceClassName:
      "border-destructive/30 bg-destructive/10 hover:bg-destructive/15",
  },
  CANCELLED_BY_BARBER: {
    label: "Cancelado",
    badgeClassName: "border-transparent bg-destructive text-white",
    surfaceClassName:
      "border-destructive/30 bg-destructive/10 hover:bg-destructive/15",
  },
};

export function getDashboardAppointmentStatusUi(status: AppointmentStatus) {
  return DASHBOARD_STATUS_UI[status] ?? null;
}
