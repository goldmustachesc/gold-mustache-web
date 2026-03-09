"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  usePrivateHeader,
  PrivateHeaderActions,
} from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Calendar,
  Clock,
  Info,
  Loader2,
  Mail,
  Plus,
  Settings,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

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

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberEmail, setNewBarberEmail] = useState("");

  usePrivateHeader({
    title: "Gerenciar Barbeiros",
    icon: Users,
    backHref: `/${locale}/dashboard`,
  });

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
    <div>
      <PrivateHeaderActions>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="hidden lg:flex bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Barbeiro
        </Button>
      </PrivateHeaderActions>
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Equipe de Barbeiros</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie os profissionais da sua barbearia
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="bg-card/30 rounded-2xl p-6 border border-border sticky top-24">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Resumo da Equipe
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-foreground">Ativos</span>
                  </div>
                  <span className="font-bold text-emerald-400 text-lg">
                    {activeBarbers.length}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Inativos
                    </span>
                  </div>
                  <span className="font-bold text-muted-foreground text-lg">
                    {inactiveBarbers.length}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">
                      Agendamentos
                    </span>
                  </div>
                  <span className="font-bold text-primary text-lg">
                    {totalAppointments}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border space-y-2">
                <Link
                  href={`/${locale}/admin/barbearia/horarios`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  <Clock className="h-4 w-4 text-primary" />
                  Horários da Barbearia
                </Link>
                <Link
                  href={`/${locale}/admin/barbearia/servicos`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Gerenciar Serviços
                </Link>
              </div>

              <div className="mt-4">
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Barbeiro
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9 space-y-6">
            <div className="lg:hidden">
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold h-12"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Barbeiro
              </Button>
            </div>

            <div className="bg-muted/50 rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Barbeiros Ativos</h2>
                    <p className="text-xs text-muted-foreground">
                      {activeBarbers.length} profissional(is) disponível(is)
                    </p>
                  </div>
                </div>
              </div>

              {activeBarbers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum barbeiro ativo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione seu primeiro barbeiro
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeBarbers.map((barber) => (
                    <div
                      key={barber.id}
                      className="bg-background/50 rounded-xl border border-border p-4 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {barber.avatarUrl ? (
                          <Image
                            src={barber.avatarUrl}
                            alt={barber.name}
                            width={56}
                            height={56}
                            className="rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/20 border border-primary/30">
                            <span className="text-xl font-bold text-primary">
                              {barber.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {barber.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                              Ativo
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {barber._count.appointments} agendamento(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                        <Link
                          href={`/${locale}/admin/barbeiros/${barber.id}/horarios`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            className="w-full border-border text-foreground hover:bg-accent hover:text-foreground"
                          >
                            <Clock className="h-4 w-4 mr-2 text-primary" />
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
                          className="text-muted-foreground hover:text-orange-400 hover:bg-orange-500/10"
                          title="Desativar barbeiro"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              title="Remover barbeiro"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-background border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">
                                Remover {barber.name}?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                {barber._count.appointments > 0 ? (
                                  <>
                                    Este barbeiro tem{" "}
                                    <strong className="text-primary">
                                      {barber._count.appointments}
                                    </strong>{" "}
                                    agendamento(s) no histórico. Ele será{" "}
                                    <strong className="text-primary">
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
                              <AlertDialogCancel className="border-border text-foreground hover:bg-accent">
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

            {inactiveBarbers.length > 0 && (
              <div className="bg-card/30 rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <UserX className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-muted-foreground">
                      Barbeiros Inativos
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {inactiveBarbers.length} profissional(is) desativado(s)
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {inactiveBarbers.map((barber) => (
                    <div
                      key={barber.id}
                      className="bg-background/30 rounded-xl border border-border p-4 opacity-70"
                    >
                      <div className="flex items-start gap-4">
                        {barber.avatarUrl ? (
                          <Image
                            src={barber.avatarUrl}
                            alt={barber.name}
                            width={56}
                            height={56}
                            className="rounded-xl object-cover grayscale"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted border border-border">
                            <span className="text-xl font-bold text-muted-foreground">
                              {barber.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-muted-foreground truncate">
                            {barber.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                              Desativado
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {barber._count.appointments} agendamento(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                        <Button
                          variant="outline"
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
                              className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              title="Remover permanentemente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-background border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">
                                Remover {barber.name} permanentemente?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                {barber._count.appointments > 0 ? (
                                  <>
                                    Este barbeiro tem{" "}
                                    <strong className="text-primary">
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
                              <AlertDialogCancel className="border-border text-foreground hover:bg-accent">
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Barbeiro</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Preencha os dados para cadastrar um novo barbeiro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Nome *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={newBarberName}
                  onChange={(e) => setNewBarberName(e.target.value)}
                  placeholder="Nome do barbeiro"
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={newBarberEmail}
                  onChange={(e) => setNewBarberEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />O barbeiro
                precisará criar uma conta com este email para acessar o sistema.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-border text-foreground hover:bg-accent"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateBarber}
              disabled={createBarber.isPending}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
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
    </div>
  );
}
