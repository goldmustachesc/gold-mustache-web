#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");

const BLOCKED_MIGRATION =
  "20260423100000_add_phone_normalized_and_history_indexes";

function isProductionEnvironment() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

async function hasMigrationBeenApplied(prisma, migrationName) {
  const rows = await prisma.$queryRaw`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${migrationName}
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
    LIMIT 1
  `;

  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  if (!isProductionEnvironment()) {
    process.exit(0);
  }

  const prisma = new PrismaClient();

  try {
    const applied = await hasMigrationBeenApplied(prisma, BLOCKED_MIGRATION);

    if (!applied) {
      console.error(
        "[migrate-guard] Bloqueado: migration de lock-risk em produção ainda não resolvida.",
      );
      console.error(
        "[migrate-guard] Execute primeiro o runbook docs/runbooks/phone-normalized-online-rollout.md e finalize com:",
      );
      console.error(
        "[migrate-guard] pnpm prisma migrate resolve --applied 20260423100000_add_phone_normalized_and_history_indexes",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(
      "[migrate-guard] Falha ao validar estado de migração em produção:",
      error,
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}

module.exports = {
  hasMigrationBeenApplied,
  isProductionEnvironment,
  main,
};
