import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground min-h-screen antialiased`}
      >
        <div className="mx-auto flex min-h-screen w-full flex-col px-0">
          <header className="hidden">
            <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
              <Link href="/" className="font-semibold tracking-tight">
                The Floor
              </Link>
              <div className="flex items-center gap-5 text-sm">
                <Link href="/game" className="hover:opacity-80">
                  Game
                </Link>
                <Link href="/rules" className="hover:opacity-80">
                  Rules
                </Link>
                <Link href="/contact" className="hover:opacity-80">
                  Contact
                </Link>
              </div>
            </nav>
          </header>
          <main className="flex-1 py-10">{children}</main>
          <footer className="hidden text-muted-foreground pb-10 text-xs">
            © {new Date().getFullYear()} Nik. All rights reserved.
          </footer>
        </div>
      </body>
    </html>
  );
}
