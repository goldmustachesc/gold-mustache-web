import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoEmbed } from "@/components/ui/video-embed";
import { EVENTS_SECTION } from "@/config/events";
import { BRAND } from "@/constants/brand";
import { MessageCircle, PartyPopperIcon } from "lucide-react";

export function EventsSection() {
  const { heading, subheading, videoId, strong } = EVENTS_SECTION;
  const whatsappMessage = encodeURIComponent(
    "Olá Ygor! Gostaríamos de saber mais sobre os pacotes para eventos.",
  );
  const whatsappUrl = `https://wa.me/${BRAND.contact.whatsapp}?text=${whatsappMessage}`;

  return (
    <section id="eventos" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <Badge variant="outline" className="mb-4">
            <PartyPopperIcon className="h-4 w-4 mr-2" />
            Eventos
          </Badge>
          <h2 className="text-3xl font-playfair font-bold md:text-4xl">
            {heading} <span className="text-primary">{strong}</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{subheading}</p>
        </div>
        <div className="mx-auto max-w-4xl">
          <VideoEmbed videoId={videoId} title={heading} />
        </div>
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-xl font-semibold">
            Quer viver essa experiência no seu casamento? 💍✂️
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            Oferecemos pacotes exclusivos para noivos, padrinhos e convidados
            terem um dia inesquecível aqui na barbearia.
          </p>
          <Button asChild className="mt-6">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Entrar em contato</span>
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
