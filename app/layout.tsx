import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career OS · Ognjen Tasovac",
  description:
    "Career Operating System 2026–2041 — from EY Transaction & Corporate Finance to Private Equity Partner.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-bg min-h-screen antialiased">{children}</body>
    </html>
  );
}
