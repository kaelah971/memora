import { BrowserWindow } from "@/components/memora/browser-window";
import { AuthForm } from "@/components/memora/auth-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <BrowserWindow chromeLabel="memora / creator access" title="Memora creator access">
        <AuthForm />
      </BrowserWindow>
    </main>
  );
}
