"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { WorkspaceMode } from "@/lib/workspaces/access";
import { workspaceBasePath } from "@/lib/workspaces/entry";

interface WorkspaceSwitcherProps {
  mode: WorkspaceMode;
}

export function WorkspaceSwitcher({ mode }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const myWorkspacePath = workspaceBasePath("mine");
  const demoWorkspacePath = workspaceBasePath("demo");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (user === undefined) return null;

  return (
    <div className="workspace-switcher" aria-label="Workspace controls">
      {user ? (
        <>
          <span className="data-label workspace-switcher__identity">{user.email ?? "SIGNED-IN CREATOR"}</span>
          <a
            className={mode === "mine" ? "workspace-switcher__active" : undefined}
            href={myWorkspacePath}
            aria-current={mode === "mine" ? "page" : undefined}
          >
            MY WORKSPACE
          </a>
          <a
            className={mode === "demo" ? "workspace-switcher__active" : undefined}
            href={demoWorkspacePath}
            aria-current={mode === "demo" ? "page" : undefined}
          >
            PUBLIC DEMO
          </a>
          <button type="button" onClick={signOut}>SIGN OUT</button>
        </>
      ) : (
        <>
          <a href={myWorkspacePath}>SIGN IN FOR MY WORKSPACE</a>
          <a href={demoWorkspacePath}>VIEW PUBLIC DEMO</a>
        </>
      )}
    </div>
  );
}
