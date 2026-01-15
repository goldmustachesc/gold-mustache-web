import { prisma } from "@/lib/prisma";
import { barbershopConfig } from "@/config/barbershop";

/**
 * Tipo para as configurações da barbearia retornadas pelo serviço.
 * Combina dados do banco com fallback do config estático.
 */
export interface BarbershopSettingsData {
  // Business Identity
  name: string;
  shortName: string;
  tagline: string;
  description: string;

  // Address
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    full: string;
    withName: string;
  };

  // Coordinates
  coordinates: {
    lat: number;
    lng: number;
  };

  // Contact
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
  };

  // Social Media
  social: {
    instagram: {
      main: string;
      mainUrl: string;
      store: string | null;
      storeUrl: string | null;
    };
    googleMaps: string;
  };

  // Booking
  bookingEnabled: boolean;
  externalBookingUrl: string | null;

  // Branding
  foundingYear: number;

  // Timestamps
  updatedAt: Date | null;
}

/**
 * Busca as configurações da barbearia do banco de dados.
 * Usa fallback para o config estático se não houver dados no DB.
 */
export async function getBarbershopSettings(): Promise<BarbershopSettingsData> {
  try {
    const dbSettings = await prisma.barbershopSettings.findUnique({
      where: { id: "default" },
    });

    if (dbSettings) {
      const fullAddress = `${dbSettings.street}, ${dbSettings.number} - ${dbSettings.neighborhood}, ${dbSettings.city} - ${dbSettings.state}, ${dbSettings.zipCode}`;

      return {
        name: dbSettings.name,
        shortName: dbSettings.shortName,
        tagline: dbSettings.tagline,
        description: dbSettings.description || barbershopConfig.description,
        address: {
          street: dbSettings.street,
          number: dbSettings.number,
          neighborhood: dbSettings.neighborhood,
          city: dbSettings.city,
          state: dbSettings.state,
          zipCode: dbSettings.zipCode,
          country: dbSettings.country,
          full: fullAddress,
          withName: `${fullAddress} - ${dbSettings.name}`,
        },
        coordinates: {
          lat: Number(dbSettings.latitude),
          lng: Number(dbSettings.longitude),
        },
        contact: {
          phone: dbSettings.phone,
          whatsapp: dbSettings.whatsapp,
          email: dbSettings.email,
        },
        social: {
          instagram: {
            main: dbSettings.instagramMain,
            mainUrl: `https://instagram.com/${dbSettings.instagramMain.replace("@", "")}`,
            store: dbSettings.instagramStore,
            storeUrl: dbSettings.instagramStore
              ? `https://instagram.com/${dbSettings.instagramStore.replace("@", "")}`
              : null,
          },
          googleMaps:
            dbSettings.googleMapsUrl || barbershopConfig.social.googleMaps,
        },
        bookingEnabled: dbSettings.bookingEnabled,
        externalBookingUrl: dbSettings.externalBookingUrl,
        foundingYear: dbSettings.foundingYear,
        updatedAt: dbSettings.updatedAt,
      };
    }
  } catch (error) {
    console.error("Error fetching barbershop settings from DB:", error);
  }

  // Fallback para config estático
  return {
    name: barbershopConfig.name,
    shortName: barbershopConfig.shortName,
    tagline: barbershopConfig.tagline,
    description: barbershopConfig.description,
    address: {
      street: barbershopConfig.address.street,
      number: barbershopConfig.address.number,
      neighborhood: barbershopConfig.address.neighborhood,
      city: barbershopConfig.address.city,
      state: barbershopConfig.address.state,
      zipCode: barbershopConfig.address.zipCode,
      country: barbershopConfig.address.country,
      full: barbershopConfig.address.full,
      withName: barbershopConfig.address.withName,
    },
    coordinates: {
      lat: barbershopConfig.coordinates.lat,
      lng: barbershopConfig.coordinates.lng,
    },
    contact: {
      phone: barbershopConfig.contact.phone,
      whatsapp: barbershopConfig.contact.whatsapp,
      email: barbershopConfig.contact.email,
    },
    social: {
      instagram: {
        main: barbershopConfig.social.instagram.main,
        mainUrl: barbershopConfig.social.instagram.mainUrl,
        store: barbershopConfig.social.instagram.store,
        storeUrl: barbershopConfig.social.instagram.storeUrl,
      },
      googleMaps: barbershopConfig.social.googleMaps,
    },
    bookingEnabled: true,
    externalBookingUrl: barbershopConfig.externalBooking.inbarberUrl,
    foundingYear: barbershopConfig.foundingYear,
    updatedAt: null,
  };
}
