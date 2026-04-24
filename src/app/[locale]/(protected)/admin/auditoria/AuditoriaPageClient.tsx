"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FilterX, Loader2, ShieldCheck } from "lucide-react";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import { formatDateTimeDdMmYyyyHHmmInSaoPaulo } from "@/utils/datetime";

interface InitialFilters {
  page?: string;
  action?: string;
  resourceType?: string;
  actorProfileId?: string;
  from?: string;
  to?: string;
}

interface AuditoriaPageClientProps {
  initialFilters: InitialFilters;
}

const LIMIT = 50;

function toPage(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function normalize(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function AuditoriaPageClient({
  initialFilters,
}: AuditoriaPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  usePrivateHeader({
    title: "Auditoria",
    icon: ShieldCheck,
  });

  const [page, setPage] = useState<number>(toPage(initialFilters.page));
  const [action, setAction] = useState(initialFilters.action ?? "");
  const [resourceType, setResourceType] = useState(
    initialFilters.resourceType ?? "",
  );
  const [actorProfileId, setActorProfileId] = useState(
    initialFilters.actorProfileId ?? "",
  );
  const [from, setFrom] = useState(initialFilters.from ?? "");
  const [to, setTo] = useState(initialFilters.to ?? "");
  const [selectedPayload, setSelectedPayload] = useState<Record<
    string,
    unknown
  > | null>(null);

  const filters = useMemo(
    () => ({
      page,
      limit: LIMIT,
      action: normalize(action),
      resourceType: normalize(resourceType),
      actorProfileId: normalize(actorProfileId),
      from: normalize(from),
      to: normalize(to),
    }),
    [page, action, resourceType, actorProfileId, from, to],
  );

  const { data, isLoading, isError, isFetching } = useAdminAuditLogs(filters);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  const syncUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    if (normalize(action)) params.set("action", action.trim());
    if (normalize(resourceType))
      params.set("resourceType", resourceType.trim());
    if (normalize(actorProfileId)) {
      params.set("actorProfileId", actorProfileId.trim());
    }
    if (normalize(from)) params.set("from", from.trim());
    if (normalize(to)) params.set("to", to.trim());

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const applyFilters = () => {
    const nextPage = 1;
    setPage(nextPage);
    syncUrl(nextPage);
  };

  const clearFilters = () => {
    setAction("");
    setResourceType("");
    setActorProfileId("");
    setFrom("");
    setTo("");
    const nextPage = 1;
    setPage(nextPage);
    router.replace(pathname);
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    syncUrl(nextPage);
  };

  return (
    <main className="container mx-auto max-w-7xl space-y-4 px-4 py-6 lg:py-8">
      <section className="rounded-xl border border-border bg-card/40 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Ação (ex: REWARD_CREATE)"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          />
          <Input
            placeholder="Resource type (ex: reward)"
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
          />
          <Input
            placeholder="Admin profile ID"
            value={actorProfileId}
            onChange={(event) => setActorProfileId(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={applyFilters} disabled={isFetching}>
            Aplicar filtros
          </Button>
          <Button type="button" variant="outline" onClick={clearFilters}>
            <FilterX className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando logs de auditoria...
        </div>
      ) : isError ? (
        <div className="py-10 text-center text-sm text-destructive">
          Erro ao buscar logs de auditoria.
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Nenhum registro encontrado.
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {formatDateTimeDdMmYyyyHHmmInSaoPaulo(
                        new Date(row.createdAt),
                      )}
                    </TableCell>
                    <TableCell>
                      {row.actorName || row.actorProfileId.slice(0, 8)}
                    </TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>
                      {row.resourceType}
                      {row.resourceId ? ` (${row.resourceId.slice(0, 8)})` : ""}
                    </TableCell>
                    <TableCell>{row.ipAddress || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPayload(row.metadata)}
                        disabled={!row.metadata}
                      >
                        Ver payload
                      </Button>
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
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || isFetching}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= meta.totalPages || isFetching}
                >
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={selectedPayload !== null}
        onOpenChange={() => setSelectedPayload(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payload da auditoria</DialogTitle>
          </DialogHeader>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(selectedPayload, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </main>
  );
}
