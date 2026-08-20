import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "ReelVault — Save a Reel once. Find it later in seconds.",
    template: "%s · ReelVault",
  },
  description:
    "A privacy-first library for Instagram Reels and posts you actually want to find again. No Instagram password. No scraping. Your notes stay yours.",
  manifest: "/manifest.webmanifest",
  applicationName: "ReelVault",
  appleWebApp: {
    capable: true,
    title: "ReelVault",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3eee4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
