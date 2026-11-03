import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScreenLoaderProps {
  title?: string;
  className?: string;
}

export function ScreenLoader({
  title = "Loading...",
  className,
}: ScreenLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[300px] w-full p-8 text-center text-slate-400",
        className
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
      <p className="text-sm font-medium text-slate-300">{title}</p>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-slate-800 bg-slate-900/50 text-center",
        className
      )}
    >
      {icon && <div className="text-slate-500 mb-3">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 max-w-sm mt-1 mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  error?: string | Error;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Failed to load data",
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const errorMessage =
    typeof error === "string" ? error : error?.message || "An unexpected error occurred.";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-xl border border-rose-900/50 bg-rose-950/20 text-center",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-rose-900/50 text-rose-400 flex items-center justify-center mb-3">
        <span className="text-xl font-bold">!</span>
      </div>
      <h3 className="text-base font-semibold text-rose-200">{title}</h3>
      <p className="text-sm text-rose-400/80 max-w-md mt-1 mb-4 font-mono">
        {errorMessage}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-800/60 hover:bg-rose-700/80 text-white transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

