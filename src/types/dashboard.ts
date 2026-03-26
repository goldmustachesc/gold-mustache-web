export interface ClientStats {
  nextAppointment: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    barber: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
    service: {
      id: string;
      name: string;
      duration: number;
      price: number;
    };
  } | null;
  upcomingCount: number;
  totalVisits: number;
  totalSpent: number;
  favoriteBarber: {
    id: string;
    name: string;
    avatarUrl: string | null;
    visitCount: number;
  } | null;
  favoriteService: {
    id: string;
    name: string;
    useCount: number;
  } | null;
  lastService: {
    serviceId: string;
    serviceName: string;
    barberId: string;
    barberName: string;
  } | null;
}

export interface BarberStats {
  todayAppointments: number;
  completedToday: number;
  pendingToday: number;
  todayEarnings: number;
  weekAppointments: number;
  weekEarnings: number;
  nextClient: {
    time: string;
    clientName: string;
    serviceName: string;
    duration: number;
  } | null;
}

export interface AdminStats {
  todayAppointments: number;
  todayRevenue: number;
  weekAppointments: number;
  weekRevenue: number;
  activeBarbers: number;
  totalClients: number;
}

export interface DashboardStats {
  role: string;
  client: ClientStats | null;
  barber: BarberStats | null;
  admin: AdminStats | null;
}
