"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, Copy, Link2, MoreHorizontal, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface MyLinkCardProps {
  bookingUrl: string;
  barberName: string;
  variant?: "light" | "dark";
}

// WhatsApp icon component
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>WhatsApp</title>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// Facebook icon component
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Facebook</title>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function MyLinkCard({
  bookingUrl,
  barberName,
  variant = "light",
}: MyLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const isDark = variant === "dark";

  const truncatedUrl =
    bookingUrl.length > 35 ? `${bookingUrl.slice(0, 35)}...` : bookingUrl;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Agende seu horário comigo na Gold Mustache! 💈✂️\n\n${bookingUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(bookingUrl);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
    );
  };

  const handleShareMore = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Agende com ${barberName} - Gold Mustache`,
          text: `Agende seu horário comigo na Gold Mustache! 💈✂️`,
          url: bookingUrl,
        });
      } catch {
        // User cancelled or share failed silently
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyLink();
    }
  };

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-6",
          "bg-gradient-to-br from-amber-500 via-amber-500/90 to-amber-600",
          "shadow-xl shadow-amber-500/25",
        )}
      >
        {/* Content */}
        <div className="relative z-10 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Fale de sua agenda para seus clientes.
            </h3>
            <p className="text-sm text-white/80 mt-1">
              Compartilhe seu link com seus clientes para que eles possam
              realizar o agendamento dos serviços.
            </p>
          </div>

          {/* URL Field */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl p-1",
              isDark ? "bg-zinc-900" : "bg-white",
            )}
          >
            <div
              className={cn(
                "flex-1 px-3 py-2 text-sm truncate",
                isDark ? "text-zinc-400" : "text-zinc-600",
              )}
            >
              {truncatedUrl}
            </div>
            <Button
              onClick={handleCopyLink}
              variant="ghost"
              className={cn(
                "font-medium rounded-lg px-4",
                isDark
                  ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                  : "bg-white hover:bg-zinc-100 text-zinc-900",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copiar link
                </>
              )}
            </Button>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white/90">
                Seu link está online
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQrDialogOpen(true)}
              className="text-sm text-white/90 underline underline-offset-2 hover:text-white transition-colors"
            >
              Ver QR Code
            </button>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute -right-8 -bottom-8 opacity-10">
          <Link2 className="h-40 w-40 text-white" strokeWidth={1} />
        </div>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-4 gap-3 mt-4">
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
            isDark
              ? "bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50"
              : "bg-muted/50 hover:bg-muted",
          )}
        >
          <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center">
            <WhatsAppIcon className="h-6 w-6 text-white" />
          </div>
          <span
            className={cn(
              "text-xs",
              isDark ? "text-zinc-400" : "text-muted-foreground",
            )}
          >
            WhatsApp
          </span>
        </button>

        <button
          type="button"
          onClick={() => setQrDialogOpen(true)}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
            isDark
              ? "bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50"
              : "bg-muted/50 hover:bg-muted",
          )}
        >
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              isDark ? "bg-zinc-700" : "bg-secondary",
            )}
          >
            <QrCode
              className={cn(
                "h-6 w-6",
                isDark ? "text-zinc-200" : "text-secondary-foreground",
              )}
            />
          </div>
          <span
            className={cn(
              "text-xs",
              isDark ? "text-zinc-400" : "text-muted-foreground",
            )}
          >
            QRCode
          </span>
        </button>

        <button
          type="button"
          onClick={handleShareFacebook}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
            isDark
              ? "bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50"
              : "bg-muted/50 hover:bg-muted",
          )}
        >
          <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
            <FacebookIcon className="h-6 w-6 text-white" />
          </div>
          <span
            className={cn(
              "text-xs",
              isDark ? "text-zinc-400" : "text-muted-foreground",
            )}
          >
            Facebook
          </span>
        </button>

        <button
          type="button"
          onClick={handleShareMore}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
            isDark
              ? "bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50"
              : "bg-muted/50 hover:bg-muted",
          )}
        >
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              isDark ? "bg-zinc-700" : "bg-secondary",
            )}
          >
            <MoreHorizontal
              className={cn(
                "h-6 w-6",
                isDark ? "text-zinc-200" : "text-secondary-foreground",
              )}
            />
          </div>
          <span
            className={cn(
              "text-xs",
              isDark ? "text-zinc-400" : "text-muted-foreground",
            )}
          >
            Mais
          </span>
        </button>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent
          className={cn(
            "sm:max-w-md",
            isDark && "bg-zinc-900 border-zinc-800 text-white",
          )}
        >
          <DialogHeader>
            <DialogTitle className={cn("text-center", isDark && "text-white")}>
              QR Code do seu link
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG
                value={bookingUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p
              className={cn(
                "text-sm text-center max-w-xs",
                isDark ? "text-zinc-400" : "text-muted-foreground",
              )}
            >
              Mostre este QR Code para seus clientes escanearem e acessarem
              diretamente sua página de agendamento.
            </p>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className={cn(
                "w-full",
                isDark && "border-zinc-700 hover:bg-zinc-800 text-white",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Link copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar link
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
