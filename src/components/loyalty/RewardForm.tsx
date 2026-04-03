"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

function createRewardSchema(t: (key: string) => string) {
  return z.object({
    name: z
      .string()
      .min(1, t("validation.nameRequired"))
      .max(100, t("validation.nameMaxLength")),
    description: z.string().optional(),
    pointsCost: z.number().int().min(1, t("validation.pointsCostPositive")),
    type: z.enum(["DISCOUNT", "FREE_SERVICE", "PRODUCT"]),
    value: z.number().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    stock: z.number().int().positive().optional(),
    active: z.boolean().default(true),
  });
}

export type CreateRewardData = z.infer<ReturnType<typeof createRewardSchema>>;

interface RewardFormProps {
  initialData?: Partial<CreateRewardData>;
  onSubmit: (data: CreateRewardData) => Promise<void>;
  isLoading?: boolean;
  mode?: "create" | "edit";
  onCancel?: () => void;
}

export function RewardForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode = "create",
  onCancel,
}: RewardFormProps) {
  const t = useTranslations("loyalty.admin.rewardForm");
  const rewardSchema = useMemo(() => createRewardSchema(t), [t]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateRewardData>({
    name: "",
    description: "",
    pointsCost: 100,
    type: "FREE_SERVICE",
    value: undefined,
    imageUrl: "",
    stock: undefined,
    active: true,
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    try {
      rewardSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          if (err.path.length > 0) {
            const field = err.path[0] as string;
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (mode === "create") {
        setFormData({
          name: "",
          description: "",
          pointsCost: 100,
          type: "FREE_SERVICE",
          value: undefined,
          imageUrl: "",
          stock: undefined,
          active: true,
        });
      }
    } catch (error) {
      console.error("Error submitting reward:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof CreateRewardData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input
          id="name"
          placeholder={t("namePlaceholder")}
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          disabled={isLoading || isSubmitting}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("descriptionLabel")}</Label>
        <Textarea
          id="description"
          placeholder={t("descriptionPlaceholder")}
          rows={3}
          value={formData.description || ""}
          onChange={(e) => updateField("description", e.target.value)}
          disabled={isLoading || isSubmitting}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pointsCost">{t("pointsCostLabel")}</Label>
          <Input
            id="pointsCost"
            type="number"
            placeholder="1000"
            min={1}
            value={formData.pointsCost}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || Number.isNaN(parseInt(value, 10))) {
                updateField("pointsCost", 1);
              } else {
                const parsedValue = parseInt(value, 10);
                updateField("pointsCost", parsedValue >= 1 ? parsedValue : 1);
              }
            }}
            disabled={isLoading || isSubmitting}
          />
          {errors.pointsCost && (
            <p className="text-sm text-destructive">{errors.pointsCost}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">{t("typeLabel")}</Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              updateField("type", value as CreateRewardData["type"])
            }
            disabled={isLoading || isSubmitting}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder={t("typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE_SERVICE">
                {t("typeFreeService")}
              </SelectItem>
              <SelectItem value="DISCOUNT">{t("typeDiscount")}</SelectItem>
              <SelectItem value="PRODUCT">{t("typeProduct")}</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-sm text-destructive">{errors.type}</p>
          )}
        </div>
      </div>

      {formData.type === "DISCOUNT" && (
        <div className="space-y-2">
          <Label htmlFor="value">{t("discountValueLabel")}</Label>
          <Input
            id="value"
            type="number"
            placeholder="20"
            min={0.01}
            step={0.01}
            value={formData.value || ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || Number.isNaN(parseFloat(value))) {
                updateField("value", 0);
              } else {
                updateField("value", parseFloat(value));
              }
            }}
            disabled={isLoading || isSubmitting}
          />
          <p className="text-sm text-muted-foreground">
            {t("discountValueHint")}
          </p>
          {errors.value && (
            <p className="text-sm text-destructive">{errors.value}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="imageUrl">{t("imageUrlLabel")}</Label>
        <Input
          id="imageUrl"
          placeholder={t("imageUrlPlaceholder")}
          value={formData.imageUrl || ""}
          onChange={(e) => updateField("imageUrl", e.target.value)}
          disabled={isLoading || isSubmitting}
        />
        <p className="text-sm text-muted-foreground">{t("imageUrlHint")}</p>
        {errors.imageUrl && (
          <p className="text-sm text-destructive">{errors.imageUrl}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="stock">{t("stockLabel")}</Label>
        <Input
          id="stock"
          type="number"
          placeholder={t("stockPlaceholder")}
          min={1}
          value={formData.stock || ""}
          onChange={(e) =>
            updateField(
              "stock",
              e.target.value
                ? Number.isNaN(parseInt(e.target.value, 10))
                  ? undefined
                  : parseInt(e.target.value, 10)
                : undefined,
            )
          }
          disabled={isLoading || isSubmitting}
        />
        <p className="text-sm text-muted-foreground">{t("stockHint")}</p>
        {errors.stock && (
          <p className="text-sm text-destructive">{errors.stock}</p>
        )}
      </div>

      <div className="flex flex-row items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base font-medium">{t("activeLabel")}</Label>
          <p className="text-sm text-muted-foreground">{t("activeHint")}</p>
        </div>
        <Switch
          checked={formData.active}
          onCheckedChange={(checked) => updateField("active", checked)}
          disabled={isLoading || isSubmitting}
        />
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (onCancel) {
              onCancel();
              return;
            }
            setFormData({
              name: "",
              description: "",
              pointsCost: 100,
              type: "FREE_SERVICE",
              value: undefined,
              imageUrl: "",
              stock: undefined,
              active: true,
            });
          }}
          disabled={isLoading || isSubmitting}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={isLoading || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : mode === "edit" ? (
            t("saveChanges")
          ) : (
            t("createReward")
          )}
        </Button>
      </div>
    </form>
  );
}
