import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Collection Tracker",
    template: "%s · Collection Tracker",
  },
  applicationName: "Collection Tracker",
  description: "Build, analyze, and manage TCG decks and collections with AI-powered insights.",
  openGraph: {
    title: "Collection Tracker",
    description: "Build, analyze, and manage TCG decks and collections with AI-powered insights.",
    url: "/",
    siteName: "Collection Tracker",
    images: [
      {
        url: "/hero-section-main-app-dark.png",
        width: 1200,
        height: 630,
        alt: "Collection Tracker",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Collection Tracker",
    description: "Build, analyze, and manage TCG decks and collections with AI-powered insights.",
    images: ["/hero-section-main-app-dark.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overscroll-none`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider>
            <ConvexClientProvider>
              {children}
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
