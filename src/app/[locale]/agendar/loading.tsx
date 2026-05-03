export default function AgendarLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-200 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      <div className="flex min-h-dvh flex-col items-center px-3 pt-2 pb-4">
        {/* Back button */}
        <div className="w-full max-w-5xl mb-1">
          <div className="h-8 w-20 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>

        <div className="w-full max-w-5xl flex-1 flex flex-col gap-3">
          {/* Chat header */}
          <div className="flex items-center justify-between py-3 px-1 border-b border-zinc-300/50 dark:border-zinc-800/50">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            </div>
          </div>

          {/* Progress chips */}
          <div className="flex gap-2 overflow-x-hidden">
            {[88, 72, 96, 80].map((w) => (
              <div
                key={w}
                className="h-7 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse"
                style={{ width: w }}
              />
            ))}
          </div>

          {/* Bot message */}
          <div className="flex gap-2 items-start">
            <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse shrink-0" />
            <div className="h-10 w-56 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          </div>

          {/* Barber selector skeleton: 2x2 grid */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
