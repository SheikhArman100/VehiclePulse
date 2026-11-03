"use client";

import React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useLayout } from "./context";
import { cn } from "@/lib/utils";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, isMobile } = useLayout();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />
      <div className="flex flex-1 pt-16">
        <Sidebar />
        <main
          className={cn(
            "flex-1 transition-all duration-300 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] bg-slate-950",
            sidebarOpen && !isMobile ? "lg:ms-64" : "lg:ms-20",
            isMobile && "ms-0"
          )}
        >
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

