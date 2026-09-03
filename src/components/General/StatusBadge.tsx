import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";
interface Props {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}

const tones: Record<StatusTone, string> = {
  neutral:
    "border-zinc-200 bg-zinc-100/60 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400",
  info: "border-blue-200/80 bg-blue-50/80 text-blue-700 dark:border-blue-800/80 dark:bg-blue-950/80 dark:text-blue-300",
  success:
    "border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/80 dark:text-emerald-300",
  warning:
    "border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/80 dark:text-amber-300",
  danger:
    "border-red-200/80 bg-red-50/80 text-red-700 dark:border-red-800/80 dark:bg-red-950/80 dark:text-red-300",
};

export default function StatusBadge({ children, tone = "neutral", className }: Props) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
