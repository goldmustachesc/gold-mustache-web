export type UserRole = "CLIENT" | "BARBER" | "ADMIN";

export interface ProfileMeData {
  id: string;
  userId: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
