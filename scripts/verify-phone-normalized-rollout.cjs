#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");

const TARGET_MIGRATION =
  "20260423100000_add_phone_normalized_and_history_indexes";

async function main() {
  const prisma = new PrismaClient();

  try {
    const [columnRows, indexRows, migrationRows, pendingRows] =
      await Promise.all([
        prisma.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'phone_normalized'
      `,
        prisma.$queryRaw`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'profiles_phone_normalized_idx',
            'appointments_client_id_date_idx',
            'appointments_guest_client_id_date_idx'
          )
      `,
        prisma.$queryRaw`
        SELECT migration_name
        FROM "_prisma_migrations"
        WHERE migration_name = ${TARGET_MIGRATION}
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
      `,
        prisma.$queryRaw`
        SELECT COUNT(*)::int AS pending_rows
        FROM profiles
        WHERE phone IS NOT NULL AND phone_normalized IS NULL
      `,
      ]);

    const indexNames = new Set(indexRows.map((row) => row.indexname));
    const status = {
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
      pendingRows: pendingRows[0]?.pending_rows ?? null,
    };

    console.log(JSON.stringify(status, null, 2));

    const ok =
      status.migrationApplied &&
      status.columnExists &&
      status.indexes.profilesPhoneNormalized &&
      status.indexes.appointmentsClientDate &&
      status.indexes.appointmentsGuestDate &&
      status.pendingRows === 0;

    process.exit(ok ? 0 : 1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
