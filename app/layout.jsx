'use client';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { Toaster } from "../components/ui/sonner";
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function AppShell({ children }) {
  const pathname = usePathname();
  const hideFooter = pathname.startsWith('/dashboard') || pathname.startsWith('/login') || pathname.startsWith('/auction');

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {children}
      </main>

      {!hideFooter && (
        <footer className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-gray-900 to-[#0A0D13]"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mb-6">
                <Image
                  src="/assets/uiuvccuplogo.png"
                  alt="UIU VC Cup Logo"
                  width={80}
                  height={80}
                  className="rounded-full mx-auto"
                />
              </div>
              <div className="mb-8">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2">
                  UIU VC CUP
                </h2>
                <p className="text-xl md:text-2xl text-gray-300 font-medium">
                  Sports Tournament
                </p>
              </div>
              <div className="text-gray-400 space-y-2">
                <p>&copy; 2024 UIU VC Cup. All rights reserved.</p>
                <p className="text-sm">Built By UIUDH &amp; Taki Tahmid</p>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ErrorBoundary>
            <AppShell>{children}</AppShell>
          </ErrorBoundary>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
