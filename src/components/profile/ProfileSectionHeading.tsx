import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileSectionHeadingProps {
  icon: LucideIcon;
  title: string;
  description: string;
  id?: string;
  className?: string;
}

export function ProfileSectionHeading({
  icon: Icon,
  title,
  description,
  id,
  className,
}: ProfileSectionHeadingProps) {
  return (
    <div id={id} className={cn("flex items-start gap-4", className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h2 className="font-playfair text-xl font-bold text-foreground">
          {title}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
