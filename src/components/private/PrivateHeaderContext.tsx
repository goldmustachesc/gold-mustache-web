"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

interface HeaderConfig {
  title: string;
  icon?: LucideIcon;
  backHref?: string;
}

interface SidebarState {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PrivateHeaderContextValue {
  config: HeaderConfig;
  setConfig: (config: HeaderConfig) => void;
  sidebar: SidebarState;
  actionsContainerRef: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_CONFIG: HeaderConfig = {
  title: "",
};

const PrivateHeaderContext = createContext<PrivateHeaderContextValue | null>(
  null,
);

export function PrivateHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig>(DEFAULT_CONFIG);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const actionsContainerRef = useRef<HTMLDivElement | null>(null);

  const sidebar = useMemo<SidebarState>(
    () => ({ open: sidebarOpen, onOpenChange: setSidebarOpen }),
    [sidebarOpen],
  );

  const value = useMemo<PrivateHeaderContextValue>(
    () => ({ config, setConfig, sidebar, actionsContainerRef }),
    [config, sidebar],
  );

  return (
    <PrivateHeaderContext.Provider value={value}>
      {children}
    </PrivateHeaderContext.Provider>
  );
}

function usePrivateHeaderContext() {
  const ctx = useContext(PrivateHeaderContext);
  if (!ctx) {
    throw new Error(
      "usePrivateHeaderContext must be used within PrivateHeaderProvider",
    );
  }
  return ctx;
}

interface UsePrivateHeaderOptions {
  title: string;
  icon?: LucideIcon;
  backHref?: string;
}

export function usePrivateHeader({
  title,
  icon,
  backHref,
}: UsePrivateHeaderOptions) {
  const { setConfig } = usePrivateHeaderContext();

  useEffect(() => {
    setConfig({ title, icon, backHref });
  }, [title, icon, backHref, setConfig]);
}

export function PrivateHeaderActions({ children }: { children: ReactNode }) {
  const { actionsContainerRef } = usePrivateHeaderContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const container = actionsContainerRef.current;
  if (mounted && container) {
    return createPortal(children, container);
  }
  return null;
}

export function usePrivateHeaderConfig(): HeaderConfig {
  return usePrivateHeaderContext().config;
}

export function usePrivateSidebarState(): SidebarState {
  return usePrivateHeaderContext().sidebar;
}

export function useActionsContainerRef() {
  return usePrivateHeaderContext().actionsContainerRef;
}
