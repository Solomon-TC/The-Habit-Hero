import { TempoInit } from "@/components/tempo-init";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ErrorHandler } from "@/components/ui/error-handler";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Habit Tracker - Build Better Habits",
  description:
    "A modern habit tracking application to help you build consistent routines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <head>
        <Script src="https://api.tempolabs.ai/proxy-asset?url=https://storage.googleapis.com/tempo-public-assets/error-handling.js" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary
          fallback={
            <div className="p-4 max-w-md mx-auto my-8">
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                <h3 className="text-lg font-medium">Something went wrong</h3>
                <p className="mt-2">
                  Please try refreshing the page or signing in again.
                </p>
                <a
                  href="/sign-in"
                  className="mt-4 inline-block px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md"
                >
                  Go to Sign In
                </a>
              </div>
            </div>
          }
        >
          <ErrorHandler
            fallback={
              <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
                <p className="font-medium">We encountered an issue</p>
                <p className="text-sm">
                  The application is still working, but some features might be
                  limited.
                </p>
              </div>
            }
          />
          {children}
        </ErrorBoundary>
        <TempoInit />
      </body>
    </html>
  );
}
