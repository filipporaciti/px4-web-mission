import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "PX4 Web Mission Editor",
  description: "A web-based mission editor for custom drone missions, allowing users to create and edit drone missions with a visual interface.",
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
      <body className="h-full flex flex-col overflow-hidden">
        <header className="w-full border-b py-3 px-4 bg-white/60">
          <nav className="flex gap-4 items-center">
            <Link href="/editor" className="text-sm font-medium">Editor</Link>
            <Link href="/draw" className="text-sm font-medium">Draw</Link>
          </nav>
        </header>
        <main className="flex-1 min-h-0 p-4 overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
