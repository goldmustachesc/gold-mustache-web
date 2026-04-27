interface KpiCardProps {
  testId: string;
  icon: React.ReactNode;
  label: string;
  value: string | number;
  locale?: string;
}

export function KpiCard({
  testId,
  icon,
  label,
  value,
  locale = "pt-BR",
}: KpiCardProps) {
  const formatted =
    typeof value === "number" ? value.toLocaleString(locale) : value;

  return (
    <div className="flex h-full flex-col bg-card border border-border rounded-xl p-3 shadow-sm sm:p-5">
      <div className="mb-1.5 flex min-h-[2.25rem] items-center gap-1.5 sm:mb-2 sm:min-h-0 sm:gap-2">
        <span className="shrink-0">{icon}</span>
        <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground sm:text-xs">
          {label}
        </span>
      </div>
      <p
        data-testid={testId}
        className="mt-auto text-xl font-bold tabular-nums text-foreground sm:text-2xl"
      >
        {formatted}
      </p>
    </div>
  );
}
