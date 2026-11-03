"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_NAVIGATION } from "@/config/navigation";
import { useLayout } from "./context";
import { cn } from "@/lib/utils";
import { Activity, Radio } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, isMobile } = useLayout();

  return (
    <aside
      className={cn(
        "fixed top-16 start-0 bottom-0 z-30 flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20",
        isMobile && !sidebarOpen && "hidden"
      )}
    >
      {/* Brand Sub-header in Sidebar */}
      <div className="flex items-center px-4 py-3 border-b border-slate-800/80 gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
          <Radio className="h-5 w-5 animate-pulse text-blue-400" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Telemetry Stream
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Nginx :80 Live
            </span>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {SIDEBAR_NAVIGATION.map((group) => (
          <div key={group.groupTitle} className="space-y-1">
            {sidebarOpen && (
              <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {group.groupTitle}
              </h4>
            )}
            <ul className="space-y-1 mt-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.path);

                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      title={!sidebarOpen ? item.title : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm"
                          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-blue-400" : "text-slate-400")} />
                      {sidebarOpen && (
                        <span className="truncate">{item.title}</span>
                      )}
                      {sidebarOpen && item.badge && (
                        <span className="ms-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* System Footer Info */}
      {sidebarOpen && (
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50">
          <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Cluster State</span>
              <span className="text-emerald-400 font-mono">KRaft v3.8</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Nginx Proxy</span>
              <span className="text-blue-400 font-mono">Port 80</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

