import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind classes cleanly with clsx and twMerge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats an ISO date string into human-friendly local time.
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "—";
  }
}

/**
 * Formats a speed number (km/h) to display string.
 */
export function formatSpeed(speedKmh: number | null | undefined): string {
  if (speedKmh === null || speedKmh === undefined) return "—";
  return `${Math.round(speedKmh)} km/h`;
}

/**
 * Formats distance/odometer (km) to 1 decimal place.
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return `${km.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/**
 * Formats fuel or battery percentage.
 */
export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `${Math.round(val)}%`;
}

