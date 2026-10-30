import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Layers2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { demo } from "@/config/demo";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `Demo for ${demo.clientName}`,
    template: `%s · ${demo.clientName}`,
  },
  description: demo.summary,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="font-sans">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="border-b bg-white/80">
          <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <Link
              href="/"
              className="flex items-center gap-3 font-semibold tracking-tight"
            >
              <span className="rounded-xl bg-primary p-2 text-primary-foreground">
                <Layers2 className="size-5" />
              </span>
              {demo.clientName}
              <span className="hidden text-sm font-normal text-muted-foreground sm:inline">
                / demo
              </span>
            </Link>
            <nav
              aria-label="Main navigation"
              className="flex items-center gap-5 text-sm font-medium"
            >
              <Link
                href="/"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Overview
              </Link>
              <Link
                href="/items"
                className="flex items-center gap-1 hover:text-primary"
              >
                Workspace <ArrowUpRight className="size-4" />
              </Link>
            </nav>
          </header>
        </div>
        <main>{children}</main>
        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-8 text-xs text-muted-foreground sm:px-8">
          <span>Prepared for {demo.clientName}</span>
          <span>A small preview. A promising start.</span>
        </footer>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
