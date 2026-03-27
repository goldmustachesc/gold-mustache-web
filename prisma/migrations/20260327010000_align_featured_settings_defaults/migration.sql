-- Align featured service defaults with the current Prisma schema and UI copy.
-- This normalizes environments that received the earlier featured settings migration.

ALTER TABLE "barbershop_settings"
ALTER COLUMN "featured_badge" SET DEFAULT 'Mais Popular',
ALTER COLUMN "featured_title" SET DEFAULT 'Combo Completo',
ALTER COLUMN "featured_description" SET DEFAULT 'Corte + Barba + Sobrancelha - O pacote completo para um visual impecável',
ALTER COLUMN "featured_duration" SET DEFAULT 'Aproximadamente 60 minutos',
ALTER COLUMN "featured_original_price" SET DEFAULT 115.00,
ALTER COLUMN "featured_discounted_price" SET DEFAULT 100.00;

UPDATE "barbershop_settings"
SET
  "featured_badge" = 'Mais Popular',
  "featured_title" = 'Combo Completo',
  "featured_description" = 'Corte + Barba + Sobrancelha - O pacote completo para um visual impecável',
  "featured_duration" = 'Aproximadamente 60 minutos',
  "featured_original_price" = 115.00,
  "featured_discounted_price" = 100.00
WHERE
  "featured_badge" = 'Economize R$15'
  AND "featured_title" = 'Combo Completo'
  AND "featured_description" = 'Corte + Barba + Sobrancelha'
  AND "featured_duration" = '1h 15min'
  AND "featured_original_price" = 115.00
  AND "featured_discounted_price" = 100.00;
