export type UserRole = "CLIENT" | "BARBER" | "ADMIN";

export interface ProfileAddress {
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

export interface ProfileMeData {
  id: string;
  userId: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  // Address fields
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  // Account verification
  emailVerified: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Re-export ProfileUpdateInput from validations to avoid duplication
export type { ProfileUpdateInput } from "@/lib/validations/profile";
