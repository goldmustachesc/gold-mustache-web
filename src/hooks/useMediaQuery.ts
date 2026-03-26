"use client";

import { useState, useEffect } from "react";

/**
 * Hook para detectar se uma media query corresponde ao viewport atual.
 * SSR-safe: retorna false no servidor e sincroniza no cliente.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

/**
 * Hook para detectar se o viewport é desktop (lg breakpoint = 1024px).
 * Retorna false no servidor e em viewports menores que 1024px.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
