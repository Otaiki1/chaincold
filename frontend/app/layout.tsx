import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cold Chain Dashboard - Shipment Tracking",
  description: "Track shipments, monitor live telemetry, and verify Merkle roots on-chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <nav className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900">
          <div className="container mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                <Image
                  src="/logo.png"
                  alt="ChainCold Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
                <span className="text-xl font-medium text-gray-900 dark:text-white tracking-tight">
                  ChainCold
                </span>
              </Link>
              <div className="flex gap-8">
                <Link
                  href="/track"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Track
                </Link>
                <Link
                  href="/live"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Live
                </Link>
                <Link
                  href="/verify"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Verify
                </Link>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
