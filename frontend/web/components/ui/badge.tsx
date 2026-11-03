import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-blue-600/20 text-blue-400 border border-blue-500/30",
    secondary: "border-transparent bg-slate-800 text-slate-300",
    destructive: "border-transparent bg-rose-500/20 text-rose-400 border border-rose-500/30",
    outline: "border-slate-700 text-slate-300",
    success: "border-transparent bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    warning: "border-transparent bg-amber-500/20 text-amber-400 border border-amber-500/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

