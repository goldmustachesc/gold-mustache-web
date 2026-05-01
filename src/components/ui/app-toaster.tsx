"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Toaster } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    setMounted(true);
  }, []);

  const toasterTheme = mounted && resolvedTheme === "dark" ? "dark" : "light";

  return (
    <Toaster
      position={isMobile ? "top-center" : "bottom-right"}
      theme={toasterTheme}
      closeButton
      toastOptions={{
        className:
          "!bg-card/95 !text-card-foreground !backdrop-blur-xl !border !border-border !shadow-2xl !shadow-black/10 !rounded-xl",
        descriptionClassName: "!text-muted-foreground",
        style: {
          padding: "16px",
        },
        classNames: {
          success:
            "!border-emerald-500/30 [&>svg]:!text-emerald-500 dark:[&>svg]:!text-emerald-400",
          error:
            "!border-red-500/30 [&>svg]:!text-red-500 dark:[&>svg]:!text-red-400",
          warning:
            "!border-amber-500/30 [&>svg]:!text-amber-500 dark:[&>svg]:!text-amber-400",
          info: "!border-blue-500/30 [&>svg]:!text-blue-500 dark:[&>svg]:!text-blue-400",
        },
      }}
    />
  );
}
