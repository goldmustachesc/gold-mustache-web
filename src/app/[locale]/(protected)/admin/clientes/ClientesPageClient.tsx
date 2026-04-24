"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminClientData } from "@/app/api/admin/clients/route";
import { apiGetCollection } from "@/lib/api/client";
import type { ApiCollectionResponse } from "@/types/api";

type ClientFilterType = "all" | "registered" | "guest";

async function fetchClients(params: {
  search: string;
  type: ClientFilterType;
  page: number;
  limit: number;
}): Promise<ClientsResponse> {
  const searchParams = new URLSearchParams();
  if (params.search.trim()) searchParams.set("search", params.search.trim());
  searchParams.set("type", params.type);
  searchParams.set("page", String(params.page));
  searchParams.set("limit", String(params.limit));

  return apiGetCollection<AdminClientData>(
    `/api/admin/clients?${searchParams}`,
  );
}

type ClientsResponse = ApiCollectionResponse<AdminClientData>;

export function ClientesPageClient() {
  usePrivateHeader({ title: "Clientes", icon: Users });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<ClientFilterType>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-clients-page", debouncedSearch, type, page],
    queryFn: () =>
      fetchClients({
        search: debouncedSearch,
        type,
        page,
        limit,
      }),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <main className="container mx-auto max-w-6xl space-y-4 px-4 py-6 lg:py-8">
      <div className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            placeholder="Buscar por nome ou telefone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={type === "all" ? "default" : "outline"}
              onClick={() => {
                setType("all");
                setPage(1);
              }}
            >
              Todos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={type === "registered" ? "default" : "outline"}
              onClick={() => {
                setType("registered");
                setPage(1);
              }}
            >
              Cadastrados
            </Button>
            <Button
              type="button"
              size="sm"
              variant={type === "guest" ? "default" : "outline"}
              onClick={() => {
                setType("guest");
                setPage(1);
              }}
            >
              Convidados
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Carregando clientes...
        </div>
      ) : isError ? (
        <div className="py-8 text-center text-sm text-destructive">
          Erro ao carregar clientes.
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum cliente encontrado.
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((client) => (
                  <TableRow key={`${client.type}-${client.id}`}>
                    <TableCell>{client.fullName || "Cliente"}</TableCell>
                    <TableCell>{client.phone || "—"}</TableCell>
                    <TableCell>
                      {client.type === "registered"
                        ? "Cadastrado"
                        : "Convidado"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {meta && meta.totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {meta.page} de {meta.totalPages} ({meta.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
