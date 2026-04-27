import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface QuickActionProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  variant?: "default" | "primary";
  linkTarget?: "_blank";
  linkRel?: string;
}

export function QuickAction({
  href,
  icon,
  label,
  description,
  variant = "default",
  linkTarget,
  linkRel,
}: QuickActionProps) {
  return (
    <Link href={href} target={linkTarget} rel={linkRel}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl transition-all duration-200",
          "p-3 sm:p-4",
          "hover:scale-[1.02] hover:shadow-lg",
          variant === "primary"
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/20"
            : "bg-card/50 hover:bg-card border border-border text-foreground",
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg",
              "h-8 w-8 sm:h-10 sm:w-10",
              variant === "primary"
                ? "bg-white/20"
                : "bg-muted/50 group-hover:bg-muted",
            )}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate sm:text-base">
              {label}
            </p>
            {description && (
              <p
                className={cn(
                  "text-xs truncate",
                  variant === "primary"
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {description}
              </p>
            )}
          </div>
          <ChevronRight
            aria-hidden
            className={cn(
              "hidden shrink-0 transition-transform group-hover:translate-x-1 sm:block sm:h-5 sm:w-5",
              variant === "primary"
                ? "text-primary-foreground/60"
                : "text-muted-foreground",
            )}
          />
        </div>
      </div>
    </Link>
  );
}
