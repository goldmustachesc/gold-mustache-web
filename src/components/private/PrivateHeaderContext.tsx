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

const DEFAULT_CONFIG: HeaderConfig = { title: "" };

const HeaderConfigContext = createContext<HeaderConfig>(DEFAULT_CONFIG);
const HeaderSetConfigContext = createContext<(config: HeaderConfig) => void>(
  () => {},
);
const SidebarContext = createContext<SidebarState>({
  open: false,
  onOpenChange: () => {},
});
const ActionsRefContext = createContext<React.RefObject<HTMLDivElement | null>>(
  {
    current: null,
  },
);

export function PrivateHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig>(DEFAULT_CONFIG);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const actionsContainerRef = useRef<HTMLDivElement | null>(null);

  const sidebar = useMemo<SidebarState>(
    () => ({ open: sidebarOpen, onOpenChange: setSidebarOpen }),
    [sidebarOpen],
  );

  return (
    <HeaderSetConfigContext.Provider value={setConfig}>
      <HeaderConfigContext.Provider value={config}>
        <SidebarContext.Provider value={sidebar}>
          <ActionsRefContext.Provider value={actionsContainerRef}>
            {children}
          </ActionsRefContext.Provider>
        </SidebarContext.Provider>
      </HeaderConfigContext.Provider>
    </HeaderSetConfigContext.Provider>
  );
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
  const setConfig = useContext(HeaderSetConfigContext);

  useEffect(() => {
    setConfig({ title, icon, backHref });
  }, [title, icon, backHref, setConfig]);
}

export function PrivateHeaderActions({ children }: { children: ReactNode }) {
  const actionsContainerRef = useContext(ActionsRefContext);
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
  return useContext(HeaderConfigContext);
}

export function usePrivateSidebarState(): SidebarState {
  return useContext(SidebarContext);
}

export function useActionsContainerRef() {
  return useContext(ActionsRefContext);
}
