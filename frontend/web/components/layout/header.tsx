"use client";

import React from "react";
import Link from "next/link";
import { useLayout } from "./context";
import {
  Menu,
  Activity,
  Radio,
  Server,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { toggleSidebar } = useLayout();

  return (
    <header className="fixed top-0 start-0 end-0 z-40 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur-md">
      {/* Brand & Sidebar Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-100 transition-colors focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-lg shadow-md">
            VP
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-white text-base">
              Vehicle<span className="text-blue-500">Pulse</span>
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
              Fleet Telemetry Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Top Status & Indicators */}
      <div className="flex items-center gap-3">
        {/* Nginx & Microservices Pipeline Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Server className="h-4 w-4 text-blue-400" />
          <span>Local Gateway:</span>
          <span className="font-mono text-emerald-400 font-medium">Active (Nginx)</span>
        </div>

        {/* Live WebSocket Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span className="text-slate-400 hidden md:inline">Pub/Sub WS:</span>
          <Badge variant="success" className="text-[11px] py-0 px-2 font-mono">
            CONNECTED
          </Badge>
        </div>
      </div>
    </header>
  );
}

