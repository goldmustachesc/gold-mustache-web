/**
 * Constantes da marca - Re-exporta de barbershopConfig para compatibilidade
 *
 * @deprecated Prefira usar `barbershopConfig` de `@/config/barbershop` diretamente.
 * Este arquivo é mantido para compatibilidade com código existente.
 */

import { barbershopConfig } from "@/config/barbershop";

/**
 * @deprecated Use `barbershopConfig` de `@/config/barbershop` diretamente.
 */
export const BRAND = {
  name: barbershopConfig.name,
  // tagline and location now come from i18n translations
  // Use t('brand.tagline') and t('brand.location')

  analytics: barbershopConfig.analytics,

  instagram: barbershopConfig.social.instagram,

  booking: {
    inbarberUrl: barbershopConfig.externalBooking.inbarberUrl,
  },

  contact: {
    phone: barbershopConfig.contact.phone,
    whatsapp: barbershopConfig.contact.whatsapp,
    email: barbershopConfig.contact.email,
    address: barbershopConfig.address.withName,
    coordinates: barbershopConfig.coordinates,
    googleMapsUrl: barbershopConfig.social.googleMaps,
  },

  contactVitor: {
    phone: barbershopConfig.barberContacts.vitor.phone,
    whatsapp: barbershopConfig.barberContacts.vitor.whatsapp,
    address: barbershopConfig.address.withName,
  },

  contactJoao: {
    phone: barbershopConfig.barberContacts.joao.phone,
    whatsapp: barbershopConfig.barberContacts.joao.whatsapp,
    address: barbershopConfig.address.withName,
  },

  contactDavid: {
    phone: barbershopConfig.barberContacts.david.phone,
    whatsapp: barbershopConfig.barberContacts.david.whatsapp,
    address: barbershopConfig.address.withName,
  },

  // Business Hours - now come from i18n translations
  // Use t('contact.hours.weekdays'), t('contact.hours.time'), etc.

  // Brand Colors (for use in custom components)
  colors: barbershopConfig.colors,

  // Featured combo pricing (Corte + Barba)
  featuredCombo: barbershopConfig.featuredCombo,
} as const;

// Services are now fetched from the database via /api/services
// Use the useServices() hook from @/hooks/useBooking for client-side
// Use getServices() from @/services/booking for server-side
