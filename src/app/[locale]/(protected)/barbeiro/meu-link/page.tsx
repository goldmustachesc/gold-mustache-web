"use client";

import { useState } from "react";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { MyLinkCard } from "@/components/dashboard/MyLinkCard";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Link2,
  Menu,
  UserPlus,
  QrCode,
  Share2,
  Eye,
  TrendingUp,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useUser } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export default function MeuLinkPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { data: user, isLoading: userLoading } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const {
    data: barberProfile,
    isLoading: barberLoading,
    error,
  } = useBarberProfile();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  useEffect(() => {
    if (!barberLoading && user && !barberProfile && !error) {
      toast.error("Acesso restrito a barbeiros");
      router.push(`/${locale}/dashboard`);
    }
  }, [barberProfile, barberLoading, user, error, router, locale]);

  const isLoading = userLoading || barberLoading;

  if (isLoading || !user || !barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  // Build the booking URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const bookingUrl = `${baseUrl}/${locale}/agendar?barbeiro=${barberProfile.id}`;

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

  const handleDownloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new window.Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qrcode-${barberProfile.name.toLowerCase().replace(/\s+/g, "-")}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          {/* Logo (visible on desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Gold Mustache"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="font-playfair text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                GOLD MUSTACHE
              </span>
            </Link>
          </div>

          {/* Mobile Title */}
          <div className="lg:hidden flex items-center gap-2">
            <Link2 className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl font-bold">Meu Link</h1>
          </div>

          {/* Desktop Title */}
          <div className="hidden lg:block flex-1 text-center">
            <h1 className="text-xl font-bold flex items-center justify-center gap-2">
              <Link2 className="h-5 w-5 text-amber-500" />
              Meu Link
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop: Buttons */}
            <Link
              href={`/${locale}/barbeiro/agendar`}
              className="hidden lg:block"
            >
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold">
                <UserPlus className="h-4 w-4 mr-2" />
                Agendar para Cliente
              </Button>
            </Link>

            {/* Desktop Quick Links */}
            <Link
              href={`/${locale}/barbeiro/horarios`}
              className="hidden lg:block"
            >
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Meus Horários
              </Button>
            </Link>
            <Link
              href={`/${locale}/barbeiro/ausencias`}
              className="hidden lg:block"
            >
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Ausências
              </Button>
            </Link>
            <Link href={`/${locale}/barbeiro`} className="hidden lg:block">
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Minha Agenda
              </Button>
            </Link>

            {/* Desktop Email */}
            <span className="hidden lg:inline text-sm text-zinc-500 px-2">
              {user?.email}
            </span>

            {/* Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* Page Title - Desktop */}
        <div className="hidden lg:block mb-8">
          <h2 className="text-2xl font-bold">
            Link de Agendamento de {barberProfile.name}
          </h2>
          <p className="text-zinc-400 mt-1">
            Compartilhe seu link personalizado e receba agendamentos diretamente
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Main Card */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <MyLinkCard
              bookingUrl={bookingUrl}
              barberName={barberProfile.name}
              variant="dark"
            />

            {/* Device Preview Section - Desktop Only */}
            <div className="hidden xl:block">
              <div className="bg-zinc-800/30 rounded-2xl border border-zinc-700/50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold">Prévia em Dispositivos</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  Veja como seus clientes visualizam a página de agendamento
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {/* Desktop Preview */}
                  <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="h-4 w-4 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Desktop</span>
                    </div>
                    <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="h-8 w-8 mx-auto mb-2 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                          <Link2 className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-xs text-zinc-400">
                          gold-mustache.com
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Mobile Preview */}
                  <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Mobile</span>
                    </div>
                    <div className="aspect-[9/16] max-h-32 mx-auto bg-zinc-800 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="h-6 w-6 mx-auto mb-1 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                          <Link2 className="h-3 w-3 text-white" />
                        </div>
                        <div className="text-[10px] text-zinc-400">Agendar</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & QR Code */}
          <div className="lg:col-span-5 xl:col-span-4 mt-6 lg:mt-0 space-y-6">
            {/* QR Code Card - Desktop */}
            <div className="hidden lg:block bg-zinc-800/30 rounded-2xl border border-zinc-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">QR Code</h3>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-xl shadow-lg shadow-black/20">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={bookingUrl}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="text-sm text-zinc-400 text-center mt-4 mb-4">
                  Imprima ou mostre para seus clientes escanearem
                </p>
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={handleDownloadQR}
                    variant="outline"
                    className="flex-1 border-zinc-700 hover:bg-zinc-800 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                  <Button
                    onClick={() => setQrDialogOpen(true)}
                    variant="outline"
                    className="flex-1 border-zinc-700 hover:bg-zinc-800 text-white"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ampliar
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Stats Card - Desktop */}
            <div className="hidden lg:block bg-zinc-800/30 rounded-2xl border border-zinc-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Dicas para Mais Agendamentos</h3>
              </div>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>
                    Compartilhe o link em suas redes sociais regularmente
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>
                    Adicione o QR Code em seu cartão de visita ou material
                    impresso
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>
                    Envie o link diretamente pelo WhatsApp após atender um
                    cliente
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>
                    Mantenha seus horários de trabalho sempre atualizados
                  </span>
                </li>
              </ul>
            </div>

            {/* Link Info Card - Desktop */}
            <div className="hidden lg:block bg-zinc-800/30 rounded-2xl border border-zinc-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Seu Link Personalizado</h3>
              </div>
              <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-700/50">
                <code className="text-sm text-amber-400 break-all">
                  {bookingUrl}
                </code>
              </div>
              <Button
                onClick={handleCopyLink}
                className={cn(
                  "w-full mt-4 font-semibold",
                  copied
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Link Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link Completo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <BarberSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        locale={locale}
      />

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-white">
              QR Code do seu link
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-6 rounded-xl">
              <QRCodeSVG
                value={bookingUrl}
                size={250}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-sm text-center text-zinc-400 max-w-xs">
              Mostre este QR Code para seus clientes escanearem e acessarem
              diretamente sua página de agendamento.
            </p>
            <div className="flex gap-2 w-full">
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="flex-1 border-zinc-700 hover:bg-zinc-800 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar PNG
              </Button>
              <Button
                onClick={handleCopyLink}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar link
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
