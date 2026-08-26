"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrowserWindow } from "@/components/memora/browser-window";
import { PrimaryButton } from "@/components/memora/primary-button";
import { WindowNavigation, type WindowNavItem } from "@/components/memora/window-navigation";

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
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const activeHref = pathname === "/app" ? "/app" : appNavigation.find((item) => pathname.startsWith(item.href) && item.href !== "/app")?.href;

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link className="wordmark" href="/">
          <span className="wordmark__dot" aria-hidden="true" />
          MEMORA
        </Link>
        <div className="app-shell__header-meta">
          <span className="data-label">CREATOR WORKSPACE</span>
          <PrimaryButton href="/">BACK TO STORY</PrimaryButton>
        </div>
      </header>
      <main className="app-shell__main">
        <BrowserWindow chromeLabel="memora / creator workspace" title="Memora creator workspace">
          <WindowNavigation
            items={appNavigation}
            activeHref={activeHref}
            action={<a className="window-navigation__settings" href="/app/settings">SETTINGS</a>}
          />
          {children}
        </BrowserWindow>
      </main>
    </div>
  );
}
