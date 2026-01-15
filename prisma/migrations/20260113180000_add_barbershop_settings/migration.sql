-- Create barbershop_settings table (singleton - only one row)
-- Stores editable business information for the barbershop

CREATE TABLE "barbershop_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    
    -- Business Identity
    "name" TEXT NOT NULL DEFAULT 'Gold Mustache Barbearia',
    "short_name" TEXT NOT NULL DEFAULT 'Gold Mustache',
    "tagline" TEXT NOT NULL DEFAULT 'Tradição e Estilo Masculino',
    "description" TEXT,
    
    -- Address
    "street" TEXT NOT NULL DEFAULT 'R. 115',
    "number" TEXT NOT NULL DEFAULT '79',
    "neighborhood" TEXT NOT NULL DEFAULT 'Centro',
    "city" TEXT NOT NULL DEFAULT 'Itapema',
    "state" TEXT NOT NULL DEFAULT 'SC',
    "zip_code" TEXT NOT NULL DEFAULT '88220-000',
    "country" TEXT NOT NULL DEFAULT 'BR',
    
    -- Coordinates (Google Maps)
    "latitude" DECIMAL(10, 8) NOT NULL DEFAULT -27.0923025919406,
    "longitude" DECIMAL(11, 8) NOT NULL DEFAULT -48.611896766062245,
    
    -- Contact
    "phone" TEXT NOT NULL DEFAULT '47 98904-6178',
    "whatsapp" TEXT NOT NULL DEFAULT '+5547989046178',
    "email" TEXT NOT NULL DEFAULT 'contato@goldmustachebarbearia.com.br',
    
    -- Social Media
    "instagram_main" TEXT NOT NULL DEFAULT '@goldmustachebarbearia',
    "instagram_store" TEXT,
    "google_maps_url" TEXT,
    
    -- Booking
    "booking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "external_booking_url" TEXT,
    
    -- Branding
    "founding_year" INTEGER NOT NULL DEFAULT 2018,
    
    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barbershop_settings_pkey" PRIMARY KEY ("id")
);

-- Insert default settings row
INSERT INTO "barbershop_settings" ("id") VALUES ('default');

-- Create trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_barbershop_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER barbershop_settings_updated_at_trigger
    BEFORE UPDATE ON "barbershop_settings"
    FOR EACH ROW
    EXECUTE FUNCTION update_barbershop_settings_updated_at();
