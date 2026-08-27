import type { ReactNode } from "react";

import { AppShell } from "@/components/memora/app-shell";
import { getCurrentWorkspaceSelection } from "@/lib/workspaces/access";

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const selection = await getCurrentWorkspaceSelection();

  return (
    <AppShell
      isAuthenticated={Boolean(selection.user)}
      workspaceMode={selection.mode}
      workspaceRoute={selection.route}
    >
      {children}
    </AppShell>
  );
}
