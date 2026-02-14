import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { DatabaseProvider } from "@/components/providers/database-provider";
import { OnlineStatusProvider } from "@/components/providers/online-status-provider";
import { SyncProvider } from "@/components/providers/sync-provider";
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
  title: "Canteen Kiosk",
  description: "Employee canteen meal attendance kiosk",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Canteen Kiosk",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OnlineStatusProvider>
          <DatabaseProvider>
            <SyncProvider>
              {children}
            </SyncProvider>
            <Toaster position="top-right" />
          </DatabaseProvider>
        </OnlineStatusProvider>
      </body>
    </html>
  );
}
