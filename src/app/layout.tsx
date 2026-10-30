import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Claude AI front desk — demo",
  description:
    "A sample salon front desk that answers questions and books appointments.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
