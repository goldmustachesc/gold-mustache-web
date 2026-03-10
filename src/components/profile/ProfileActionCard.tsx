import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProfileActionCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  variant?: "default" | "primary";
  target?: "_blank";
  rel?: string;
  download?: boolean;
}

export function ProfileActionCard({
  href,
  icon: Icon,
  label,
  description,
  variant = "default",
  target,
  rel,
  download = false,
}: ProfileActionCardProps) {
  const isAnchor = download || href.startsWith("#") || href.startsWith("/api/");
  const className = cn(
    "group flex min-h-[116px] flex-col justify-between rounded-xl border p-5 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    variant === "primary"
      ? "border-primary/25 bg-secondary text-secondary-foreground hover:border-primary/50"
      : "border-border bg-card hover:border-primary/30 hover:bg-accent/35",
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg border",
            variant === "primary"
              ? "border-primary/30 bg-primary/15 text-primary"
              : "border-primary/20 bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight
          className={cn(
            "mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1",
            variant === "primary"
              ? "text-secondary-foreground/60"
              : "text-muted-foreground",
          )}
        />
      </div>
      <div className="space-y-1.5">
        <p className="font-medium">{label}</p>
        <p
          className={cn(
            "text-sm",
            variant === "primary"
              ? "text-secondary-foreground/75"
              : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      </div>
    </>
  );

  if (isAnchor) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        download={download}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} target={target} rel={rel} className={className}>
      {content}
    </Link>
  );
}
