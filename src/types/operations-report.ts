export interface OperationalReportPeriod {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
}

export interface NoShowByBarberEntry {
  barberId: string;
  barberName: string;
  noShowCount: number;
  lostRevenue: number;
}

export interface NoShowReport {
  totalNoShows: number;
  totalLostRevenue: number;
  byBarber: NoShowByBarberEntry[];
}

export interface RetentionBucket {
  totalWithHistory: number;
  inactive30Days: number;
  inactive60Days: number;
  inactive90Days: number;
}

export interface RetentionReport {
  asOf: string;
  registeredClients: RetentionBucket;
  guestClients: RetentionBucket;
}

export interface OperationalReportsData {
  period: OperationalReportPeriod;
  noShow: NoShowReport;
  retention: RetentionReport;
}
