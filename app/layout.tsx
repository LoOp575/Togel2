import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { WarningBanner } from "@/components/WarningBanner";

export const metadata: Metadata = {
  title: "4D Probability Engine",
  description:
    "Statistical probability ranking, pattern analysis, and backtesting for 4-digit draws.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-gray-100 antialiased">
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="flex-1 px-4 py-5 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-6xl space-y-5">
              <WarningBanner />
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
