import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "OneClick Timestamps - Generate YouTube Timestamps Instantly",
  description: "Generate accurate, AI-powered YouTube timestamps in one click. Support for any language.",
};

import { ThemeProvider } from "@/components/theme-provider"

const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_aGVscGZ1bC1kb2ctNzEuY2xlcmsuYWNjb3VudHMuZGV2JA';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${inter.variable}`}>
        <body className="antialiased min-h-screen font-inter">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
