import { prisma } from "@/lib/prisma";
import { normalizePhoneDigits } from "@/lib/booking/phone";

/**
 * Result of attempting to link guest appointments to a profile.
 */
export interface LinkGuestResult {
  /** Whether any linking occurred */
  linked: boolean;
  /** Number of appointments transferred to the profile */
  appointmentsTransferred: number;
  /** Whether the guest client record was deleted */
  guestClientDeleted: boolean;
}

/**
 * Links appointments from a guest client to a registered profile based on phone number.
 *
 * When a user signs up with a phone number that matches an existing guest client,
 * this function transfers all appointments from the guest to the profile and
 * removes the guest client record.
 *
 * @param profileId - The profile ID to link appointments to
 * @param phone - The phone number to match (will be normalized)
 * @returns Result indicating what was linked/transferred
 */
export async function linkGuestAppointmentsToProfile(
  profileId: string,
  phone: string | null | undefined,
): Promise<LinkGuestResult> {
  // Early return if no phone provided
  if (!phone) {
    return {
      linked: false,
      appointmentsTransferred: 0,
      guestClientDeleted: false,
    };
  }

  const normalizedPhone = normalizePhoneDigits(phone);

  // Early return if phone normalizes to empty string
  if (!normalizedPhone) {
    return {
      linked: false,
      appointmentsTransferred: 0,
      guestClientDeleted: false,
    };
  }

  // Use transaction to ensure atomicity
  return prisma.$transaction(async (tx) => {
    // Find guest client by normalized phone
    const guestClient = await tx.guestClient.findUnique({
      where: { phone: normalizedPhone },
    });

    // No guest client found with this phone
    if (!guestClient) {
      return {
        linked: false,
        appointmentsTransferred: 0,
        guestClientDeleted: false,
      };
    }

    // Transfer all appointments from guest to profile
    const updateResult = await tx.appointment.updateMany({
      where: { guestClientId: guestClient.id },
      data: {
        clientId: profileId,
        guestClientId: null,
      },
    });

    // Delete the guest client record
    await tx.guestClient.delete({
      where: { id: guestClient.id },
    });

    console.log(
      `[Guest Link] Transferred ${updateResult.count} appointments from guest ${guestClient.id} to profile ${profileId}`,
    );

    return {
      linked: true,
      appointmentsTransferred: updateResult.count,
      guestClientDeleted: true,
    };
  });
}
