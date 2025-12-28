"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-destructive/10 rounded-full">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-destructive">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm text-destructive">
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
          <AlertDialogContent>
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
                className="border-destructive/50 focus:ring-destructive"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>
                {t("dialog.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={!isConfirmed || isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
