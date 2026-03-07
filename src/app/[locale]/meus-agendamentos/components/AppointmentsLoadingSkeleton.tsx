"use client";

export function AppointmentsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div
        data-testid="skeleton-cta"
        className="h-12 bg-muted animate-pulse rounded-lg lg:hidden"
      />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            data-testid="skeleton-card"
            className="rounded-xl border border-border bg-card animate-pulse"
          >
            <div className="h-1 bg-muted rounded-t-xl" />
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
                <div className="h-5 w-20 bg-muted rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-9 bg-muted rounded-lg" />
                <div className="h-9 bg-muted rounded-lg" />
              </div>
              <div className="h-9 bg-muted rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
