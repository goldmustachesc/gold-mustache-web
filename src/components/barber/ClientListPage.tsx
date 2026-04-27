"use client";

import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBarberClients, type ClientData } from "@/hooks/useBarberClients";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Info,
  Loader2,
  Plus,
  Search,
  Scissors,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useDeferredValue, useCallback } from "react";
import { AddClientDialog } from "./AddClientDialog";
import { BanClientDialog } from "./BanClientDialog";
import { ClientCard } from "./ClientCard";
import { ClientHistoryDialog } from "./ClientHistoryDialog";
import { EditClientDialog } from "./EditClientDialog";
import { UnbanClientDialog } from "./UnbanClientDialog";

export function ClientListPage() {
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  usePrivateHeader({
    title: "Clientes",
    icon: Users,
    backHref: `/${locale}/barbeiro`,
  });

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  const {
    data: response,
    isLoading,
    error,
  } = useBarberClients(deferredSearch || undefined, page);

  const clients = response?.data ?? [];
  const meta = response?.meta;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleViewHistory = useCallback((client: ClientData) => {
    setSelectedClient(client);
    setHistoryDialogOpen(true);
  }, []);

  const handleEdit = useCallback((client: ClientData) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  }, []);

  const handleBan = useCallback((client: ClientData) => {
    setSelectedClient(client);
    setBanDialogOpen(true);
  }, []);

  const handleUnban = useCallback((client: ClientData) => {
    setSelectedClient(client);
    setUnbanDialogOpen(true);
  }, []);

  const registeredClients = clients.filter((c) => c.type === "registered");
  const guestClients = clients.filter((c) => c.type === "guest");
  const totalClients = meta?.total ?? clients.length;

  return (
    <div>
      <main className="flex-1 pb-24 lg:pb-8">
        <div className="lg:hidden">
          <div className="px-4 py-4 grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl p-3 border border-primary/30">
              <p className="text-primary text-xs uppercase">Total</p>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? "—" : totalClients}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs uppercase">
                Cadastrados
              </p>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? "—" : registeredClients.length}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <p className="text-muted-foreground text-xs uppercase">
                Convidados
              </p>
              <p className="text-2xl font-bold text-foreground">
                {isLoading ? "—" : guestClients.length}
              </p>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar por nome ou telefone..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 pr-4 py-5 bg-muted/50 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex-1 px-4 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-red-400">Erro ao carregar clientes</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Tente novamente mais tarde
                </p>
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-muted-foreground">
                  {search
                    ? "Nenhum cliente encontrado"
                    : "Nenhum cliente cadastrado"}
                </p>
                {!search && (
                  <p className="text-muted-foreground text-sm mt-1">
                    Clientes aparecerão aqui quando agendarem
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {clients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onViewHistory={handleViewHistory}
                      onEdit={handleEdit}
                      onBan={handleBan}
                      onUnban={handleUnban}
                    />
                  ))}
                </div>

                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 pb-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-border hover:bg-accent"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {page} de {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= meta.totalPages}
                      className="border-border hover:bg-accent"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex gap-6">
                <aside className="w-3/12 space-y-4">
                  <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/30 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="text-sm text-primary font-medium">
                        Total de Clientes
                      </span>
                    </div>
                    <div className="text-4xl font-bold text-foreground mb-1">
                      {isLoading ? "—" : totalClients}
                    </div>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-primary/20">
                      <div>
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-xs text-muted-foreground">
                            Cadastrados
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {isLoading ? "—" : registeredClients.length}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <UserPlus className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-xs text-muted-foreground">
                            Convidados
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {isLoading ? "—" : guestClients.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-xl border border-border p-4">
                    <h3 className="font-semibold text-foreground mb-3 text-sm">
                      Ações Rápidas
                    </h3>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro/agendar`}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar para Cliente
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro`}>
                          <Scissors className="h-4 w-4 mr-2" />
                          Minha Agenda
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro/faturamento`}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Faturamento
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro/horarios`}>
                          <Clock className="h-4 w-4 mr-2" />
                          Meus Horários
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-primary text-sm mb-1">
                          Dica
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Clientes são adicionados automaticamente ao realizar
                          agendamentos. Você também pode adicionar manualmente
                          clicando em &quot;Novo Cliente&quot;.
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                <div className="w-9/12 space-y-4">
                  <div className="bg-muted/50 rounded-xl border border-border p-4">
                    <div className="relative max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Pesquisar por nome ou telefone..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-12 pr-4 py-5 bg-background/50 border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="bg-card/30 rounded-xl p-5 border border-border min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {search
                          ? `Resultados para "${search}"`
                          : "Todos os Clientes"}
                      </h2>
                      {!isLoading && totalClients > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {totalClients} cliente
                          {totalClients !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {isLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <p className="text-red-400 font-medium">
                          Erro ao carregar clientes
                        </p>
                        <p className="text-muted-foreground text-sm mt-1">
                          Tente novamente mais tarde
                        </p>
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Users className="h-16 w-16 text-zinc-700 mb-4" />
                        <p className="text-muted-foreground text-lg font-medium">
                          {search
                            ? "Nenhum cliente encontrado"
                            : "Nenhum cliente cadastrado"}
                        </p>
                        {!search && (
                          <p className="text-muted-foreground text-sm mt-1">
                            Clientes aparecerão aqui quando agendarem ou quando
                            você adicioná-los
                          </p>
                        )}
                        {!search && (
                          <Button
                            onClick={() => setAddDialogOpen(true)}
                            className="mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-black font-semibold"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Cliente
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {clients.map((client) => (
                            <ClientCard
                              key={client.id}
                              client={client}
                              onViewHistory={handleViewHistory}
                              onEdit={handleEdit}
                              onBan={handleBan}
                              onUnban={handleUnban}
                            />
                          ))}
                        </div>

                        {meta && meta.totalPages > 1 && (
                          <div className="flex items-center justify-between pt-4">
                            <Button
                              variant="outline"
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="border-border hover:bg-accent"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Página {page} de {meta.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              onClick={() => setPage((p) => p + 1)}
                              disabled={page >= meta.totalPages}
                              className="border-border hover:bg-accent"
                            >
                              Próxima
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-6 right-6 lg:hidden">
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="h-14 w-14 rounded-2xl shadow-lg shadow-primary/20 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-black"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      <AddClientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      <ClientHistoryDialog
        client={selectedClient}
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />

      <EditClientDialog
        client={selectedClient}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <BanClientDialog
        client={selectedClient}
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
      />

      <UnbanClientDialog
        client={selectedClient}
        open={unbanDialogOpen}
        onOpenChange={setUnbanDialogOpen}
      />
    </div>
  );
}
