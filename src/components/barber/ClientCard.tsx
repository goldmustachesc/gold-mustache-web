"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ClientData } from "@/hooks/useBarberClients";
import { cn } from "@/lib/utils";
import {
  Ban,
  Calendar,
  Pencil,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";

interface ClientCardProps {
  client: ClientData;
  onViewHistory?: (client: ClientData) => void;
  onEdit?: (client: ClientData) => void;
  onBan?: (client: ClientData) => void;
  onUnban?: (client: ClientData) => void;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>WhatsApp</title>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export const ClientCard = memo(function ClientCard({
  client,
  onViewHistory,
  onEdit,
  onBan,
  onUnban,
}: ClientCardProps) {
  const handleWhatsApp = () => {
    const digits = client.phone.replace(/\D/g, "");
    const phoneWithCountry = digits.startsWith("55") ? digits : `55${digits}`;
    window.open(`https://wa.me/${phoneWithCountry}`, "_blank");
  };

  const isRegistered = client.type === "registered";

  return (
    <div
      className={cn(
        "flex flex-wrap sm:flex-nowrap items-center gap-2 p-4 rounded-xl transition-all duration-200",
        "bg-card/50 border border-border",
        "hover:border-border hover:bg-card/70",
        client.isBanned && "border-destructive/30 bg-destructive/10",
      )}
    >
      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            client.isBanned
              ? "bg-destructive/15 text-destructive"
              : isRegistered
                ? "bg-gradient-to-br from-amber-500 to-yellow-600 text-black"
                : "bg-muted text-muted-foreground",
          )}
        >
          {client.isBanned ? (
            <Ban className="h-5 w-5" />
          ) : isRegistered ? (
            <UserCheck className="h-5 w-5" />
          ) : (
            <User className="h-5 w-5" />
          )}
        </div>

        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-semibold uppercase tracking-wide truncate",
                client.isBanned ? "text-destructive" : "text-foreground",
              )}
            >
              {client.fullName}
            </h3>
            {client.isBanned && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs px-1.5 py-0">
                Banido
              </Badge>
            )}
            {!isRegistered && !client.isBanned && (
              <Badge className="bg-muted text-muted-foreground border-border text-xs px-1.5 py-0">
                Convidado
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {formatPhone(client.phone)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto sm:ml-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleWhatsApp}
          className="text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10"
          title="Enviar WhatsApp"
        >
          <WhatsAppIcon className="h-4.5 w-4.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onViewHistory?.(client)}
          className="text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
          title="Ver histórico"
        >
          <Calendar className="h-4.5 w-4.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit?.(client)}
          className="text-muted-foreground hover:text-accent-foreground hover:bg-accent"
          title="Editar cliente"
        >
          <Pencil className="h-4.5 w-4.5" />
        </Button>

        {client.isBanned ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onUnban?.(client)}
            className="text-success hover:text-success hover:bg-success/10"
            title="Desbanir cliente"
          >
            <ShieldCheck className="h-4.5 w-4.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onBan?.(client)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Banir cliente"
          >
            <Ban className="h-4.5 w-4.5" />
          </Button>
        )}
      </div>
    </div>
  );
});
