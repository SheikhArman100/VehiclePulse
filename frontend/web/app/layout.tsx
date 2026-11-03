import type { Metadata } from "next";
import "./globals.css";
import RootProvider from "@/provider/root-provider";
import { LayoutProvider } from "@/components/layout/context";
import { MainLayout } from "@/components/layout/main-layout";

export const metadata: Metadata = {
  title: "VehiclePulse — Real-Time Fleet Telemetry Platform",
  description: "Distributed telemetry, analytics, alert incident management, and vehicle command streaming.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <RootProvider>
          <LayoutProvider>
            <MainLayout>{children}</MainLayout>
          </LayoutProvider>
        </RootProvider>
      </body>
    </html>
  );
}
