-- Add featured service settings to barbershop_settings table
-- These fields allow admins to configure the homepage featured combo/service

ALTER TABLE "barbershop_settings"
ADD COLUMN "featured_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "featured_badge" TEXT NOT NULL DEFAULT 'Economize R$15',
ADD COLUMN "featured_title" TEXT NOT NULL DEFAULT 'Combo Completo',
ADD COLUMN "featured_description" TEXT NOT NULL DEFAULT 'Corte + Barba + Sobrancelha',
ADD COLUMN "featured_duration" TEXT NOT NULL DEFAULT '1h 15min',
ADD COLUMN "featured_original_price" DECIMAL(10, 2) NOT NULL DEFAULT 115.00,
ADD COLUMN "featured_discounted_price" DECIMAL(10, 2) NOT NULL DEFAULT 100.00;
