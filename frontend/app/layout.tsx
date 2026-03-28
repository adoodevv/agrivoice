import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "./components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AGRIVOICE – Voice Marketplace for Ghanaian Farmers",
  description:
    "Speak in Twi, Ga, or English to check crop prices, list your produce, and get farming advice — powered by GhanaNLP.",
  keywords: ["agriculture", "Ghana", "farmers", "voice", "marketplace", "Twi", "GhanaNLP"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AGRIVOICE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d2618",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-sand-bg">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
