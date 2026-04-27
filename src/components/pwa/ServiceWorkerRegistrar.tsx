"use client";

import { useEffect } from "react";

const SERVICE_WORKER_PATH = "/sw.js";
const APP_CACHE_PREFIX = "gold-mustache-shell-";

async function clearAppCaches() {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(APP_CACHE_PREFIX))
        .map((cacheName) => window.caches.delete(cacheName)),
    );
  } catch (error) {
    console.warn("Falha ao limpar cache da aplicação", error);
  }
}

async function unregisterServiceWorkers() {
  try {
    const registration = await navigator.serviceWorker.getRegistration(
      window.location.href,
    );
    if (registration) {
      await registration.unregister();
    }
  } catch (error) {
    console.warn("Falha ao remover Service Workers", error);
  }
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const isProduction = process.env.NODE_ENV === "production";

    const setupServiceWorker = async () => {
      if (!isProduction) {
        await unregisterServiceWorkers();
        await clearAppCaches();
        return;
      }

      try {
        await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
      } catch (error) {
        console.warn("Falha ao registrar Service Worker", error);
      }
    };

    void setupServiceWorker();
  }, []);

  return null;
}
