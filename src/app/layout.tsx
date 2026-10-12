import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";

// Geist is self-hosted from the `geist` package, so builds never depend on
// fetching fonts from Google at build time.

export const metadata: Metadata = {
  title: { default: "Tenly", template: "%s · Tenly" },
  description:
    "Multi-tenant SaaS starter with organizations, role-based access, Razorpay subscriptions, usage limits and an MCP server for AI agents.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
