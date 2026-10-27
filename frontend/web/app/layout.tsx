import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VehiclePulse — Real-Time Telemetry & Operations Dashboard",
  description: "Real-Time Vehicle Telemetry & Event Streaming Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
