"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { PrivateHeader } from "./PrivateHeader";
import {
  PrivateHeaderProvider,
  usePrivateSidebarState,
} from "./PrivateHeaderContext";
import { mobileOffsetClassName } from "./mobile-nav-layout";
import { PrivateSidebar } from "./PrivateSidebar";

function ShellInner({ children }: { children: ReactNode }) {
  const { open, onOpenChange } = usePrivateSidebarState();

  return (
    <div className="private-theme min-h-screen bg-background text-foreground">
      <PrivateHeader />
      <div className={mobileOffsetClassName}>{children}</div>
      <BottomNav />
      <PrivateSidebar open={open} onOpenChange={onOpenChange} />
    </div>
  );
}

export function PrivateShell({ children }: { children: ReactNode }) {
  return (
    <PrivateHeaderProvider>
      <ShellInner>{children}</ShellInner>
    </PrivateHeaderProvider>
  );
}
