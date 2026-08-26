import type { ReactNode } from "react";

import { AppShell } from "@/components/memora/app-shell";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
