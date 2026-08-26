import type { ReactNode } from "react";

interface AppScreenProps {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  children: ReactNode;
}

export function AppScreen({ eyebrow, title, description, status = "STATIC SHELL / P0", children }: AppScreenProps) {
  return (
    <div className="app-screen">
      <header className="app-screen__header">
        <div>
          <span className="section-label">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="app-screen__status data-label">{status}</span>
      </header>
      {children}
    </div>
  );
}
