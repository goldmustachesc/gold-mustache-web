"use client";

import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";
import { useBarberClients, type ClientData } from "@/hooks/useBarberClients";
import {
  Calendar,
  Clock,
  DollarSign,
  Info,
  Loader2,
  Menu,
  Plus,
  Search,
  Scissors,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useDeferredValue } from "react";
import { AddClientDialog } from "./AddClientDialog";
import { ClientCard } from "./ClientCard";
import { ClientHistoryDialog } from "./ClientHistoryDialog";
import { EditClientDialog } from "./EditClientDialog";

export function ClientListPage() {
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  const {
    data: clients = [],
    isLoading,
    error,
  } = useBarberClients(deferredSearch || undefined);

  const handleViewHistory = (client: ClientData) => {
    setSelectedClient(client);
    setHistoryDialogOpen(true);
  };

  const handleEdit = (client: ClientData) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  };

  const registeredClients = clients.filter((c) => c.type === "registered");
  const guestClients = clients.filter((c) => c.type === "guest");

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 supports-[backdrop-filter]:bg-zinc-900/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/${locale}`} className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Gold Mustache"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <BrandWordmark className="hidden lg:block text-xl">
                  GOLD MUSTACHE
                </BrandWordmark>
              </Link>
            </div>

            {/* Mobile Title */}
            <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              <h1 className="text-lg font-playfair font-bold text-primary">
                Lista de Clientes
              </h1>
            </div>

            {/* Desktop Center Title */}
            <div className="hidden lg:flex items-center gap-3">
              <Users className="h-5 w-5 text-amber-500" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                Lista de Clientes
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop: Add Client Button */}
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="hidden lg:flex bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>

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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 lg:pb-8">
        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Stats Cards Mobile */}
          <div className="px-4 py-4 grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/10 rounded-xl p-3 border border-amber-500/30">
              <p className="text-amber-400 text-xs uppercase">Total</p>
              <p className="text-2xl font-bold text-white">
                {isLoading ? "—" : clients.length}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
              <p className="text-zinc-400 text-xs uppercase">Cadastrados</p>
              <p className="text-2xl font-bold text-white">
                {isLoading ? "—" : registeredClients.length}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
              <p className="text-zinc-400 text-xs uppercase">Convidados</p>
              <p className="text-2xl font-bold text-white">
                {isLoading ? "—" : guestClients.length}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <Input
                type="text"
                placeholder="Pesquisar por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-4 py-5 bg-zinc-800/50 border-zinc-700/50 rounded-xl text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Client List */}
          <div className="flex-1 px-4 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-red-400">Erro ao carregar clientes</p>
                <p className="text-zinc-500 text-sm mt-1">
                  Tente novamente mais tarde
                </p>
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400">
                  {search
                    ? "Nenhum cliente encontrado"
                    : "Nenhum cliente cadastrado"}
                </p>
                {!search && (
                  <p className="text-zinc-500 text-sm mt-1">
                    Clientes aparecerão aqui quando agendarem
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onViewHistory={handleViewHistory}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex gap-6">
                {/* Sidebar */}
                <aside className="w-3/12 space-y-4">
                  {/* Stats Summary */}
                  <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/10 rounded-xl border border-amber-500/30 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-amber-500" />
                      <span className="text-sm text-amber-400 font-medium">
                        Total de Clientes
                      </span>
                    </div>
                    <div className="text-4xl font-bold text-white mb-1">
                      {isLoading ? "—" : clients.length}
                    </div>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-amber-500/20">
                      <div>
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-xs text-zinc-400">
                            Cadastrados
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-white">
                          {isLoading ? "—" : registeredClients.length}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <UserPlus className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-xs text-zinc-400">
                            Convidados
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-white">
                          {isLoading ? "—" : guestClients.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                    <h3 className="font-semibold text-white mb-3 text-sm">
                      Ações Rápidas
                    </h3>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro/agendar`}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar para Cliente
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro`}>
                          <Scissors className="h-4 w-4 mr-2" />
                          Minha Agenda
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro/faturamento`}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Faturamento
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                        asChild
                      >
                        <Link href={`/${locale}/barbeiro/horarios`}>
                          <Clock className="h-4 w-4 mr-2" />
                          Meus Horários
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Info Card */}
                  <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/5 rounded-xl border border-amber-500/20 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-400 text-sm mb-1">
                          Dica
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Clientes são adicionados automaticamente ao realizar
                          agendamentos. Você também pode adicionar manualmente
                          clicando em &quot;Novo Cliente&quot;.
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* Main Content */}
                <div className="w-9/12 space-y-4">
                  {/* Search Bar */}
                  <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                    <div className="relative max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                      <Input
                        type="text"
                        placeholder="Pesquisar por nome ou telefone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-12 pr-4 py-5 bg-zinc-900/50 border-zinc-700/50 rounded-xl text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>

                  {/* Client Grid */}
                  <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50 min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-amber-500" />
                        {search
                          ? `Resultados para "${search}"`
                          : "Todos os Clientes"}
                      </h2>
                      {!isLoading && clients.length > 0 && (
                        <span className="text-sm text-zinc-500">
                          {clients.length} cliente
                          {clients.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {isLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <p className="text-red-400 font-medium">
                          Erro ao carregar clientes
                        </p>
                        <p className="text-zinc-500 text-sm mt-1">
                          Tente novamente mais tarde
                        </p>
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Users className="h-16 w-16 text-zinc-700 mb-4" />
                        <p className="text-zinc-400 text-lg font-medium">
                          {search
                            ? "Nenhum cliente encontrado"
                            : "Nenhum cliente cadastrado"}
                        </p>
                        {!search && (
                          <p className="text-zinc-500 text-sm mt-1">
                            Clientes aparecerão aqui quando agendarem ou quando
                            você adicioná-los
                          </p>
                        )}
                        {!search && (
                          <Button
                            onClick={() => setAddDialogOpen(true)}
                            className="mt-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Cliente
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {clients.map((client) => (
                          <ClientCard
                            key={client.id}
                            client={client}
                            onViewHistory={handleViewHistory}
                            onEdit={handleEdit}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FAB - Add Client (Mobile Only) */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="h-14 w-14 rounded-2xl shadow-lg shadow-amber-500/20 bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>

      {/* Sidebar */}
      <BarberSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        locale={locale}
      />

      {/* Add Client Dialog */}
      <AddClientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* Client History Dialog */}
      <ClientHistoryDialog
        client={selectedClient}
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />

      {/* Edit Client Dialog */}
      <EditClientDialog
        client={selectedClient}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
