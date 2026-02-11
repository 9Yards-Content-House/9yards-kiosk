import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a UGX price: 20000 → "UGX 20,000" */
export function formatPrice(amount: number): string {
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

/** Trigger haptic feedback on supported devices */
export function vibrate(pattern: number | number[] = 10) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/** Generate a short readable time-ago string */
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
