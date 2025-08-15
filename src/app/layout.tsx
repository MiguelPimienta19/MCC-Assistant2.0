import React from "react";
import { Geist, Geist_Mono, Inter, Fraunces } from "next/font/google";
import "./globals.css";
import Link from "next/link";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata = {
  title: "MCC Hub",
  description: "Multicultural Center — events, bookings, and meeting tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${fraunces.variable} bg-[#E8F1DA] text-[#2E4A34]`}
      >
        <header className="sticky top-0 z-40 bg-[#2E4A34] text-[#F6F4EC] border-b border-[#1F2D1C]/10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-wide">MCC Hub</Link>
            <nav className="text-sm">
              <Link href="/admin" className="hover:underline">
                Admin Dashboard
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

