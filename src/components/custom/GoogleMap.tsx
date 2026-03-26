"use client";

import { barbershopConfig } from "@/config/barbershop";

interface GoogleMapProps {
  className?: string;
}

export function GoogleMap({ className = "" }: GoogleMapProps) {
  const { coordinates } = barbershopConfig;

  // Usando Google Maps Embed API com o endereço
  const mapUrlNew = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d573.9990068809449!2d${coordinates.lng}!3d${coordinates.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94d8b1d96e6309cb%3A0x13daa59156761c02!2sBarbearia%20Gold%20Mustache%20Itapema!5e0!3m2!1spt-BR!2sbr!4v1764249792290!5m2!1spt-BR!2sbr`;

  return (
    <div className={`w-full h-full ${className}`}>
      <iframe
        src={mapUrlNew}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Localização ${barbershopConfig.name}`}
        className="rounded-lg"
      />
    </div>
  );
}
