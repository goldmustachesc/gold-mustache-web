"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiAction } from "@/lib/api/client";
import { authService } from "@/services/auth";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function DeleteAccountCard() {
  const t = useTranslations("profile.deleteAccount");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const confirmWord = t("confirmWord");
  const isConfirmed = confirmText.toLowerCase() === confirmWord.toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      await apiAction("/api/profile/delete", "DELETE");

      await authService.signOut();

      toast.success(t("success"));

      router.push(`/${locale}`);
      router.refresh();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
      setConfirmText("");
    }
  };

  return (
    <Card className="overflow-hidden border-destructive/20 bg-destructive/5 shadow-none">
      <CardHeader className="flex flex-row items-start gap-3 border-b border-destructive/15 bg-destructive/10 px-6 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base text-destructive">
            {t("title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm text-foreground">
            <p className="font-medium">{t("warning.title")}</p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
              <li>{t("warning.item1")}</li>
              <li>{t("warning.item2")}</li>
              <li>{t("warning.item3")}</li>
            </ul>
          </div>
        </div>

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              {t("button")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-border bg-background">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("dialog.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("dialog.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="confirmDelete">
                {t("dialog.confirmLabel", { word: confirmWord })}
              </Label>
              <Input
                id="confirmDelete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmWord}
                className="bg-background"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>
                {t("dialog.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={!isConfirmed || isLoading}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("dialog.deleting")}
                  </>
                ) : (
                  t("dialog.confirm")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
