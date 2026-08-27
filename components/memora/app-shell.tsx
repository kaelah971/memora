"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrowserWindow } from "@/components/memora/browser-window";
import { PrimaryButton } from "@/components/memora/primary-button";
import { StateSticker } from "@/components/memora/state-sticker";
import { WindowNavigation, type WindowNavItem } from "@/components/memora/window-navigation";
import { WorkspaceSwitcher } from "@/components/memora/workspace-switcher";
import type { WorkspaceMode } from "@/lib/workspaces/access";

const appNavigation = [
  { href: "/app", label: "HOME" },
  { href: "/app/memory", label: "MEMORY" },
  { href: "/app/import", label: "IMPORT" },
  { href: "/app/queue", label: "QUEUE" },
  { href: "/app/follow-up", label: "FOLLOW UP" },
  { href: "/app/proof", label: "PROOF" },
] satisfies readonly WindowNavItem[];

interface AppShellProps {
  children: ReactNode;
  isAuthenticated: boolean;
  workspaceMode: WorkspaceMode;
}

export function AppShell({ children, isAuthenticated, workspaceMode }: AppShellProps) {
  const pathname = usePathname();
  const activeHref = pathname === "/app" ? "/app" : appNavigation.find((item) => pathname.startsWith(item.href) && item.href !== "/app")?.href;
  const isDemo = workspaceMode === "demo";
  const workspaceLabel = isDemo ? "PUBLIC DEMO WORKSPACE" : isAuthenticated ? "MY CREATOR WORKSPACE" : "CHOOSE A WORKSPACE";
  const workspaceDescription = isDemo
    ? "Read-only source evidence and follow-up proof."
    : isAuthenticated
      ? "Private sources, memories and creator decisions."
      : "Choose the public demo or sign in to your own desk.";

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link className="wordmark" href="/">
          <span className="wordmark__dot" aria-hidden="true" />
          MEMORA
        </Link>
        <div className="app-shell__header-meta">
          <div className="app-shell__workspace-note">
            <StateSticker tone={isDemo ? "active" : isAuthenticated ? "approved" : "open"}>{workspaceLabel}</StateSticker>
            <span>{workspaceDescription}</span>
          </div>
          <PrimaryButton href="/">BACK TO MEMORA</PrimaryButton>
        </div>
      </header>
      <main className="app-shell__main">
        <BrowserWindow chromeLabel="memora / creator workspace" title="Memora creator workspace">
          <WindowNavigation
            items={appNavigation}
            activeHref={activeHref}
            action={
              <div className="window-navigation__workspace-actions">
                <WorkspaceSwitcher mode={workspaceMode} />
                <a className="window-navigation__settings" href="/app/settings">SETTINGS</a>
              </div>
            }
          />
          {children}
        </BrowserWindow>
      </main>
    </div>
  );
}
