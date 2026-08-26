import type { Metadata } from "next";
import { Gochi_Hand, IBM_Plex_Mono, Inter_Tight, Press_Start_2P } from "next/font/google";
import "./globals.css";

const uiFont = Inter_Tight({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Press_Start_2P({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const handwrittenFont = Gochi_Hand({
  variable: "--font-handwritten",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const evidenceFont = IBM_Plex_Mono({
  variable: "--font-evidence",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memora — Persistent Audience Memory for Creators",
  description:
    "Memora helps creators remember the people, questions and promises behind their audience, then follow up when the moment is right.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Memora — Persistent Audience Memory for Creators",
    description:
      "Remember the relationship behind the message. Memora keeps audience context visible so creators can follow through.",
    type: "website",
    siteName: "Memora",
  },
  twitter: {
    card: "summary",
    title: "Memora — Persistent Audience Memory for Creators",
    description:
      "A persistent audience memory layer for creators who want to keep meaningful conversations in context.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${uiFont.variable} ${displayFont.variable} ${handwrittenFont.variable} ${evidenceFont.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
