"use client";

import { useEffect, useState } from "react";
import { LoadingElevator } from "./loading-elevator";

export function LoadingElevatorWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (document.readyState === "complete") {
      setIsLoading(false);
      return;
    }

    const onReady = () => setIsLoading(false);
    window.addEventListener("load", onReady);

    const fallback = setTimeout(onReady, 500);

    return () => {
      window.removeEventListener("load", onReady);
      clearTimeout(fallback);
    };
  }, []);

  const handleAnimationComplete = () => {
    setShouldRender(false);
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <LoadingElevator
      open={!isLoading}
      onAnimationComplete={handleAnimationComplete}
    />
  );
}
