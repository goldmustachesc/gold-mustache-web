"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import {
  useAdminBarbers,
  useCreateBarber,
  useDeleteBarber,
  useUpdateBarber,
} from "@/hooks/useAdminBarbers";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Info,
  Loader2,
  Mail,
  Menu,
  Plus,
  Settings,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";

export default function AdminBarbersPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfileMe();
  const { data: barbers = [], isLoading: barbersLoading } = useAdminBarbers();

  const createBarber = useCreateBarber();
  const updateBarber = useUpdateBarber();
  const deleteBarber = useDeleteBarber();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberEmail, setNewBarberEmail] = useState("");

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  useEffect(() => {
    if (!profileLoading && user && profile?.role !== "ADMIN") {
      toast.error("Acesso restrito a administradores");
      router.push(`/${locale}/dashboard`);
    }
  }, [profile, profileLoading, user, router, locale]);

  const handleCreateBarber = async () => {
    if (!newBarberName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!newBarberEmail.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    try {
      await createBarber.mutateAsync({
        name: newBarberName.trim(),
        email: newBarberEmail.trim(),
      });
      toast.success("Barbeiro criado com sucesso!");
      setNewBarberName("");
      setNewBarberEmail("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar barbeiro",
      );
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateBarber.mutateAsync({
        id,
        active: !currentActive,
      });
      toast.success(currentActive ? "Barbeiro desativado" : "Barbeiro ativado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar barbeiro",
      );
    }
  };

  const handleDeleteBarber = async (id: string, name: string) => {
    try {
      const result = await deleteBarber.mutateAsync(id);
      if (result.softDelete) {
        toast.info(`${name} foi desativado (mantido no histórico)`);
      } else {
        toast.success(`${name} foi removido com sucesso`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover barbeiro",
      );
    }
  };

  const isLoading = userLoading || profileLoading || barbersLoading;

  if (isLoading || !user || profile?.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const activeBarbers = barbers.filter((b) => b.active);
  const inactiveBarbers = barbers.filter((b) => !b.active);
  const totalAppointments = barbers.reduce(
    (acc, b) => acc + b._count.appointments,
    0,
  );

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only lg:not-sr-only">Voltar</span>
            </Link>

            {/* Logo (desktop) */}
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
          </div>

          {/* Center - Title */}
          <div className="flex items-center gap-2 lg:flex-1 lg:justify-center">
            <Users className="h-5 w-5 text-amber-500" />
            <h1 className="text-lg lg:text-xl font-bold">
              Gerenciar Barbeiros
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Add Barber Button - Desktop */}
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="hidden lg:flex bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Barbeiro
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Novo Barbeiro
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Preencha os dados para cadastrar um novo barbeiro.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-zinc-300">
                      Nome *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="name"
                        value={newBarberName}
                        onChange={(e) => setNewBarberName(e.target.value)}
                        placeholder="Nome do barbeiro"
                        className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">
                      Email *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        value={newBarberEmail}
                        onChange={(e) => setNewBarberEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500"
                      />
                    </div>
                    <p className="text-xs text-zinc-500 flex items-start gap-1">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />O
                      barbeiro precisará criar uma conta com este email para
                      acessar o sistema.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateBarber}
                    disabled={createBarber.isPending}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  >
                    {createBarber.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Barbeiro"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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

      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* Page Title - Desktop */}
        <div className="hidden lg:block mb-8">
          <h2 className="text-2xl font-bold">Equipe de Barbeiros</h2>
          <p className="text-zinc-400 mt-1">
            Gerencie os profissionais da sua barbearia
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Stats & Actions (Desktop) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            {/* Stats Card */}
            <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50 sticky top-24">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                Resumo da Equipe
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-zinc-300">Ativos</span>
                  </div>
                  <span className="font-bold text-emerald-400 text-lg">
                    {activeBarbers.length}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">Inativos</span>
                  </div>
                  <span className="font-bold text-zinc-400 text-lg">
                    {inactiveBarbers.length}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-zinc-300">Agendamentos</span>
                  </div>
                  <span className="font-bold text-amber-400 text-lg">
                    {totalAppointments}
                  </span>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-6 pt-6 border-t border-zinc-700/50 space-y-2">
                <Link
                  href={`/${locale}/admin/barbearia/horarios`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  <Clock className="h-4 w-4 text-amber-500" />
                  Horários da Barbearia
                </Link>
                <Link
                  href={`/${locale}/admin/barbearia/servicos`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Gerenciar Serviços
                </Link>
              </div>

              {/* Add Barber Button */}
              <div className="mt-4">
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Barbeiro
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Barbers List */}
          <div className="lg:col-span-9 space-y-6">
            {/* Mobile Add Button */}
            <div className="lg:hidden">
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold h-12"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Barbeiro
              </Button>
            </div>

            {/* Active Barbers */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Barbeiros Ativos</h2>
                    <p className="text-xs text-zinc-500">
                      {activeBarbers.length} profissional(is) disponível(is)
                    </p>
                  </div>
                </div>
              </div>

              {activeBarbers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-3 text-zinc-600" />
                  <p className="text-zinc-400">Nenhum barbeiro ativo</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Adicione seu primeiro barbeiro
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeBarbers.map((barber) => (
                    <div
                      key={barber.id}
                      className="bg-zinc-900/50 rounded-xl border border-zinc-700/50 p-4 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        {barber.avatarUrl ? (
                          <Image
                            src={barber.avatarUrl}
                            alt={barber.name}
                            width={56}
                            height={56}
                            className="rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30">
                            <span className="text-xl font-bold text-amber-500">
                              {barber.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">
                            {barber.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                              Ativo
                            </span>
                            <span className="text-xs text-zinc-500">
                              {barber._count.appointments} agendamento(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-700/50">
                        <Link
                          href={`/${locale}/admin/barbeiros/${barber.id}/horarios`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            <Clock className="h-4 w-4 mr-2 text-amber-500" />
                            Horários
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleToggleActive(barber.id, barber.active)
                          }
                          disabled={updateBarber.isPending}
                          className="text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10"
                          title="Desativar barbeiro"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                              title="Remover barbeiro"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">
                                Remover {barber.name}?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                {barber._count.appointments > 0 ? (
                                  <>
                                    Este barbeiro tem{" "}
                                    <strong className="text-amber-500">
                                      {barber._count.appointments}
                                    </strong>{" "}
                                    agendamento(s) no histórico. Ele será{" "}
                                    <strong className="text-amber-500">
                                      desativado
                                    </strong>{" "}
                                    (não removido) para manter o histórico.
                                  </>
                                ) : (
                                  "Esta ação irá remover permanentemente o barbeiro e todos os seus dados."
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteBarber(barber.id, barber.name)
                                }
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                {barber._count.appointments > 0
                                  ? "Desativar"
                                  : "Remover"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inactive Barbers */}
            {inactiveBarbers.length > 0 && (
              <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                    <UserX className="h-5 w-5 text-zinc-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-400">
                      Barbeiros Inativos
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {inactiveBarbers.length} profissional(is) desativado(s)
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {inactiveBarbers.map((barber) => (
                    <div
                      key={barber.id}
                      className="bg-zinc-900/30 rounded-xl border border-zinc-800/50 p-4 opacity-70"
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        {barber.avatarUrl ? (
                          <Image
                            src={barber.avatarUrl}
                            alt={barber.name}
                            width={56}
                            height={56}
                            className="rounded-xl object-cover grayscale"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700">
                            <span className="text-xl font-bold text-zinc-500">
                              {barber.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-400 truncate">
                            {barber.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
                              Desativado
                            </span>
                            <span className="text-xs text-zinc-600">
                              {barber._count.appointments} agendamento(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800/50">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleActive(barber.id, barber.active)
                          }
                          disabled={updateBarber.isPending}
                          className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Reativar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                              title="Remover permanentemente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">
                                Remover {barber.name} permanentemente?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                {barber._count.appointments > 0 ? (
                                  <>
                                    Este barbeiro tem{" "}
                                    <strong className="text-amber-500">
                                      {barber._count.appointments}
                                    </strong>{" "}
                                    agendamento(s) no histórico e não pode ser
                                    removido permanentemente.
                                  </>
                                ) : (
                                  "Esta ação irá remover permanentemente o barbeiro. Esta ação não pode ser desfeita."
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                                Cancelar
                              </AlertDialogCancel>
                              {barber._count.appointments === 0 && (
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteBarber(barber.id, barber.name)
                                  }
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Remover Permanentemente
                                </AlertDialogAction>
                              )}
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <BarberSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        locale={locale}
      />

      <Toaster
        position="bottom-center"
        theme="dark"
        closeButton
        toastOptions={{
          className:
            "!bg-zinc-900/95 !backdrop-blur-xl !border !border-zinc-700/50 !shadow-2xl !shadow-black/20 !rounded-xl",
          descriptionClassName: "!text-zinc-400",
          style: {
            padding: "16px",
          },
          classNames: {
            success:
              "!border-emerald-500/30 !text-emerald-50 [&>svg]:!text-emerald-400",
            error: "!border-red-500/30 !text-red-50 [&>svg]:!text-red-400",
            warning:
              "!border-amber-500/30 !text-amber-50 [&>svg]:!text-amber-400",
            info: "!border-blue-500/30 !text-blue-50 [&>svg]:!text-blue-400",
          },
        }}
      />
    </div>
  );
}
