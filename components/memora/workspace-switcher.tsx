"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);

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
          <a href="/api/workspace/mode?mode=mine&next=/app">USE MY WORKSPACE</a>
          <a href="/api/workspace/mode?mode=demo&next=/app">VIEW DEMO</a>
          <button type="button" onClick={signOut}>SIGN OUT</button>
        </>
      ) : (
        <>
          <a href="/login">SIGN IN FOR YOUR WORKSPACE</a>
          <a href="/api/workspace/mode?mode=demo&next=/app">VIEW PUBLIC DEMO</a>
        </>
      )}
    </div>
  );
}
