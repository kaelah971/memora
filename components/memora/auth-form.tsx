"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AuthMode = "sign_in" | "sign_up";

function getSafeNextPath(): string {
  if (typeof window === "undefined") return "/app";
  const value = new URLSearchParams(window.location.search).get("next");
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

function getPersonalWorkspacePath(): string {
  return `/api/workspace/mode?mode=mine&next=${encodeURIComponent(getSafeNextPath())}`;
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("CHECKING SESSION...");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) router.push(getPersonalWorkspacePath());
      else setStatus("");
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus("");
    const supabase = createBrowserSupabaseClient();
    const result = mode === "sign_in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });

    if (result.error) {
      setStatus(result.error.message);
      setPending(false);
      return;
    }

    if (mode === "sign_up" && !result.data.session) {
      setStatus("Account created. Check your email to confirm the account, then sign in.");
      setPending(false);
      return;
    }

    router.push(getPersonalWorkspacePath());
  }

  return (
    <section className="auth-form" aria-labelledby="auth-form-title">
      <div className="auth-form__heading">
        <span className="section-label">MEMORA / CREATOR ACCESS</span>
        <h1 id="auth-form-title">{mode === "sign_in" ? "Return to your memory desk." : "Create your memory desk."}</h1>
        <p>Sign in to keep your own audience sources, memories and follow-up decisions separate from the public demo.</p>
      </div>
      <form onSubmit={submit}>
        <label>
          <span className="data-label">EMAIL</span>
          <input
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          <span className="data-label">PASSWORD</span>
          <input
            autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
            minLength={6}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={pending || status === "CHECKING SESSION..."}>
          {pending ? "WORKING..." : mode === "sign_in" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>
        {status ? <p className="auth-form__status" role="status">{status}</p> : null}
      </form>
      <div className="auth-form__switch">
        <span>{mode === "sign_in" ? "New to Memora?" : "Already have an account?"}</span>
        <button type="button" onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setStatus(""); }}>
          {mode === "sign_in" ? "CREATE AN ACCOUNT" : "SIGN IN INSTEAD"}
        </button>
      </div>
      <a className="secondary-link" href="/api/workspace/mode?mode=demo&next=/app">
        VIEW PUBLIC DEMO <span aria-hidden="true">↗</span>
      </a>
    </section>
  );
}
