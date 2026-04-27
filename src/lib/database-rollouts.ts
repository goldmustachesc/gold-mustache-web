import { prisma } from "@/lib/prisma";

export interface PhoneNormalizedRolloutStatus {
  migrationApplied: boolean;
  columnExists: boolean;
  indexes: {
    profilesPhoneNormalized: boolean;
    appointmentsClientDate: boolean;
    appointmentsGuestDate: boolean;
  };
}

interface ColumnRow {
  column_name: string;
}

interface IndexRow {
  indexname: string;
}

interface MigrationRow {
  migration_name: string;
}

const PHONE_NORMALIZED_MIGRATION =
  "20260423100000_add_phone_normalized_and_history_indexes";

export async function getPhoneNormalizedRolloutStatus(): Promise<PhoneNormalizedRolloutStatus> {
  try {
    const [columnRows, indexRows, migrationRows] = await Promise.all([
      prisma.$queryRaw<ColumnRow[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'phone_normalized'
      `,
      prisma.$queryRaw<IndexRow[]>`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'profiles_phone_normalized_idx',
            'appointments_client_id_date_idx',
            'appointments_guest_client_id_date_idx'
          )
      `,
      prisma.$queryRaw<MigrationRow[]>`
        SELECT migration_name
        FROM "_prisma_migrations"
        WHERE migration_name = ${PHONE_NORMALIZED_MIGRATION}
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
        LIMIT 1
      `,
    ]);

    const indexNames = new Set(indexRows.map((row) => row.indexname));

    return {
      migrationApplied: migrationRows.length > 0,
      columnExists: columnRows.length > 0,
      indexes: {
        profilesPhoneNormalized: indexNames.has(
          "profiles_phone_normalized_idx",
        ),
        appointmentsClientDate: indexNames.has(
          "appointments_client_id_date_idx",
        ),
        appointmentsGuestDate: indexNames.has(
          "appointments_guest_client_id_date_idx",
        ),
      },
    };
  } catch (error) {
    console.error("Error checking phone_normalized rollout status:", error);
    return {
      migrationApplied: false,
      columnExists: false,
      indexes: {
        profilesPhoneNormalized: false,
        appointmentsClientDate: false,
        appointmentsGuestDate: false,
      },
    };
  }
}
