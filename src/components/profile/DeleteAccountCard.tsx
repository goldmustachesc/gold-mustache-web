"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth";

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
      const response = await fetch("/api/profile/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete account");
      }

      // Sign out the user
      await authService.signOut();

      toast.success(t("success"));

      // Redirect to home page
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
    <div className="bg-red-950/30 rounded-xl border border-red-900/50 overflow-hidden">
      <div className="p-4 border-b border-red-900/30 flex items-center gap-3">
        <div className="p-2 bg-red-500/10 rounded-lg">
          <Trash2 className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h3 className="font-semibold text-red-400">{t("title")}</h3>
          <p className="text-sm text-zinc-400">{t("description")}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">
            <p className="font-medium">{t("warning.title")}</p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-zinc-400">
              <li>{t("warning.item1")}</li>
              <li>{t("warning.item2")}</li>
              <li>{t("warning.item3")}</li>
            </ul>
          </div>
        </div>

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
              <Trash2 className="mr-2 h-4 w-4" />
              {t("button")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                {t("dialog.title")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                {t("dialog.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="confirmDelete" className="text-zinc-300">
                {t("dialog.confirmLabel", { word: confirmWord })}
              </Label>
              <Input
                id="confirmDelete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmWord}
                className="bg-zinc-800 border-red-500/50 text-white placeholder:text-zinc-500 focus:ring-red-500"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isLoading}
                className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              >
                {t("dialog.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={!isConfirmed || isLoading}
                className="bg-red-600 text-white hover:bg-red-700"
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
      </div>
    </div>
  );
}
