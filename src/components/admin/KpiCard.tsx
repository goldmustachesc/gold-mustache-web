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
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p data-testid={testId} className="text-2xl font-bold text-foreground">
        {formatted}
      </p>
    </div>
  );
}
