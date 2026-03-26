/**
 * Financial statistics for a barber in a given month
 */
export interface FinancialStats {
  /** Total revenue in the period (R$) */
  totalRevenue: number;
  /** Total number of appointments completed */
  totalAppointments: number;
  /** Revenue breakdown by day */
  dailyRevenue: DailyRevenueEntry[];
  /** Revenue breakdown by service */
  serviceBreakdown: ServiceBreakdownEntry[];
  /** Average ticket value (totalRevenue / totalAppointments) */
  ticketMedio: number;
  /** Occupancy rate percentage (workedHours / availableHours * 100) */
  occupancyRate: number;
  /** Number of unique clients served */
  uniqueClients: number;
  /** Total available hours in the period based on working hours */
  availableHours: number;
  /** Total hours worked (sum of appointment durations) */
  workedHours: number;
  /** Idle hours (availableHours - workedHours) */
  idleHours: number;
  /** Hours closed due to absences */
  closedHours: number;
}

export interface DailyRevenueEntry {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Revenue for this day */
  revenue: number;
  /** Number of appointments */
  count: number;
}

export interface ServiceBreakdownEntry {
  /** Service ID */
  serviceId: string;
  /** Service name */
  name: string;
  /** Number of times this service was performed */
  count: number;
  /** Total revenue from this service */
  revenue: number;
}

/**
 * API response for financial stats endpoint
 */
export interface FinancialStatsResponse {
  stats: FinancialStats;
  barberName: string;
}

/**
 * Query parameters for financial stats
 */
export interface FinancialStatsQuery {
  month: number;
  year: number;
  barberId?: string; // Only for admin
}
