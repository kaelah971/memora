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
import { workspaceBasePath, type WorkspaceRoute } from "@/lib/workspaces/entry";

interface AppShellProps {
  children: ReactNode;
  isAuthenticated: boolean;
  workspaceMode: WorkspaceMode;
  workspaceRoute: WorkspaceRoute;
}

function navigationPath(pathname: string, basePath: string): string {
  if (pathname === basePath || pathname.startsWith(`${basePath}/`)) return pathname;
  if (pathname === "/app") return basePath;
  return pathname.startsWith("/app/") ? `${basePath}${pathname.slice("/app".length)}` : pathname;
}

export function AppShell({ children, isAuthenticated, workspaceMode, workspaceRoute }: AppShellProps) {
  const pathname = usePathname();
  const basePath = workspaceRoute === "entry" ? "/app" : workspaceBasePath(workspaceMode);
  const appNavigation = [
    { href: basePath, label: "HOME" },
    { href: `${basePath}/memory`, label: "MEMORY" },
    { href: `${basePath}/import`, label: "IMPORT" },
    { href: `${basePath}/queue`, label: "QUEUE" },
    { href: `${basePath}/follow-up`, label: "FOLLOW UP" },
    { href: `${basePath}/proof`, label: "PROOF" },
  ] satisfies readonly WindowNavItem[];
  const currentNavigationPath = navigationPath(pathname, basePath);
  const activeHref = currentNavigationPath === basePath
    ? basePath
    : appNavigation.find((item) => currentNavigationPath.startsWith(item.href) && item.href !== basePath)?.href;
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
                <a className="window-navigation__settings" href={`${basePath}/settings`}>SETTINGS</a>
              </div>
            }
          />
          {children}
        </BrowserWindow>
      </main>
    </div>
  );
}
