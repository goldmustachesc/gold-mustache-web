"use client";

import { useState } from "react";
import {
  useAdminRedemptions,
  useAdminValidateRedemption,
  useAdminUseRedemption,
  type AdminRedemption,
} from "@/hooks/useAdminLoyalty";
import { Loader2, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";

export function RedemptionsTab() {
  const t = useTranslations("loyalty.admin");
  const tRedemptions = useTranslations("loyalty.redemptions");

  const [redemptionCode, setRedemptionCode] = useState("");
  const [validatedRedemption, setValidatedRedemption] =
    useState<AdminRedemption | null>(null);
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState<
    string | undefined
  >(undefined);
  const [confirmUseCode, setConfirmUseCode] = useState<string | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [useError, setUseError] = useState<string | null>(null);

  const { data: redemptionsData, isLoading: redemptionsLoading } =
    useAdminRedemptions(redemptionStatusFilter);
  const validateRedemptionMut = useAdminValidateRedemption();
  const useRedemptionMut = useAdminUseRedemption();

  const handleValidateCode = async () => {
    if (!redemptionCode.trim()) return;
    setValidateError(null);
    try {
      const result = await validateRedemptionMut.mutateAsync(
        redemptionCode.trim().toUpperCase(),
      );
      setValidatedRedemption(result);
    } catch (error) {
      setValidatedRedemption(null);
      setValidateError(
        error instanceof ApiError
          ? error.message
          : t("redemptions.validateError"),
      );
    }
  };

  const handleConfirmUse = async () => {
    if (!confirmUseCode) return;
    setUseError(null);
    try {
      await useRedemptionMut.mutateAsync(confirmUseCode);
      setConfirmUseCode(null);
      setValidatedRedemption(null);
      setRedemptionCode("");
    } catch (error) {
      setConfirmUseCode(null);
      setUseError(
        error instanceof ApiError ? error.message : t("redemptions.useError"),
      );
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">
            {t("redemptions.validateTitle") || "Validar Código"}
          </h3>
          <div className="flex gap-3">
            <Input
              value={redemptionCode}
              onChange={(e) => setRedemptionCode(e.target.value.toUpperCase())}
              placeholder={t("redemptions.codePlaceholder") || "Ex: ABC123"}
              maxLength={6}
              className="max-w-xs font-mono uppercase border-input bg-background focus-visible:ring-amber-500"
            />
            <Button
              onClick={handleValidateCode}
              disabled={
                !redemptionCode.trim() || validateRedemptionMut.isPending
              }
              aria-label={t("redemptions.validate") || "Validar"}
            >
              {validateRedemptionMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {t("redemptions.validate") || "Validar"}
            </Button>
          </div>

          {validateError && (
            <p
              data-testid="validate-error"
              className="text-sm text-destructive mt-2"
            >
              {validateError}
            </p>
          )}

          {validatedRedemption && (
            <div
              data-testid="validated-redemption-card"
              className="mt-4 p-4 border border-border rounded-lg bg-muted/20"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-foreground">
                    {validatedRedemption.clientName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {validatedRedemption.rewardName} (
                    {validatedRedemption.rewardType})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("redemptions.code") || "Código"}:{" "}
                    <span className="font-mono">
                      {validatedRedemption.code}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("redemptions.createdAt") || "Resgatado em"}:{" "}
                    {new Date(
                      validatedRedemption.createdAt,
                    ).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("redemptions.expiresAt") || "Válido até"}:{" "}
                    {new Date(
                      validatedRedemption.expiresAt,
                    ).toLocaleDateString()}
                  </div>
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                      validatedRedemption.status === "PENDING"
                        ? "bg-amber-500/20 text-amber-500"
                        : validatedRedemption.status === "USED"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-zinc-500/20 text-zinc-400"
                    }`}
                  >
                    {tRedemptions(
                      `status.${validatedRedemption.status.toLowerCase()}`,
                    )}
                  </span>
                </div>
                {validatedRedemption.status === "PENDING" && (
                  <Button
                    onClick={() => setConfirmUseCode(validatedRedemption.code)}
                    disabled={useRedemptionMut.isPending}
                    aria-label={
                      t("redemptions.markAsUsed") || "Marcar como Usado"
                    }
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t("redemptions.markAsUsed") || "Marcar como Usado"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {useError && (
            <p
              data-testid="use-error"
              className="text-sm text-destructive mt-2"
            >
              {useError}
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex justify-between items-center p-6 pb-4">
            <h3 className="text-lg font-bold">
              {t("redemptions.recentTitle") || "Resgates Recentes"}
            </h3>
            <Select
              value={redemptionStatusFilter ?? "all"}
              onValueChange={(v) =>
                setRedemptionStatusFilter(v === "all" ? undefined : v)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("redemptions.filterAll") || "Todos"}
                </SelectItem>
                <SelectItem value="PENDING">
                  {t("redemptions.filterPending") || "Pendente"}
                </SelectItem>
                <SelectItem value="USED">
                  {t("redemptions.filterUsed") || "Usado"}
                </SelectItem>
                <SelectItem value="EXPIRED">
                  {t("redemptions.filterExpired") || "Expirado"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            {redemptionsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4">
                      {t("redemptions.colClient") || "Cliente"}
                    </th>
                    <th className="px-6 py-4">
                      {t("redemptions.colReward") || "Recompensa"}
                    </th>
                    <th className="px-6 py-4">
                      {t("redemptions.colCode") || "Código"}
                    </th>
                    <th className="px-6 py-4">
                      {t("redemptions.colDate") || "Data"}
                    </th>
                    <th className="px-6 py-4">
                      {t("redemptions.colStatus") || "Status"}
                    </th>
                    <th className="px-6 py-4 text-right">
                      {t("redemptions.colAction") || "Ação"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {redemptionsData?.data?.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">
                          {r.clientName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.clientEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4">{r.rewardName}</td>
                      <td className="px-6 py-4 font-mono">{r.code}</td>
                      <td className="px-6 py-4">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            r.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-500"
                              : r.status === "USED"
                                ? "bg-green-500/20 text-green-500"
                                : "bg-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {tRedemptions(`status.${r.status.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.status === "PENDING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmUseCode(r.code)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t("redemptions.use") || "Usar"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!redemptionsData?.data ||
                    redemptionsData.data.length === 0) && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-muted-foreground"
                      >
                        {t("redemptions.emptyState") ||
                          "Nenhum resgate encontrado."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={!!confirmUseCode}
        onOpenChange={(open) => !open && setConfirmUseCode(null)}
      >
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle>
              {t("redemptions.confirmUseTitle") || "Confirmar uso do resgate"}
            </DialogTitle>
            <DialogDescription>
              {t("redemptions.confirmUseDescription") ||
                "Tem certeza que deseja marcar este resgate como usado? Esta ação não pode ser desfeita."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUseCode(null)}>
              {t("redemptions.cancel") || "Cancelar"}
            </Button>
            <Button
              onClick={handleConfirmUse}
              disabled={useRedemptionMut.isPending}
              aria-label={t("redemptions.confirm") || "Confirmar"}
            >
              {useRedemptionMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {t("redemptions.confirm") || "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
