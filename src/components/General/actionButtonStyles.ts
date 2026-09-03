import { twMerge } from "tailwind-merge";

export type ActionButtonTone = "default" | "primary" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<ActionButtonTone, string> = {
  default:
    "border-zinc-400 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700",
  primary:
    "border-green-600 bg-green-600 text-zinc-50 hover:border-green-500 hover:bg-green-500 dark:border-green-400 dark:bg-green-400 dark:text-zinc-950 dark:hover:border-green-500 dark:hover:bg-green-500",
  success:
    "border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-zinc-50 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-400 dark:hover:text-zinc-950",
  warning:
    "border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-zinc-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-400 dark:hover:text-zinc-950",
  danger:
    "border-red-600 text-red-600 hover:bg-red-600 hover:text-zinc-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400 dark:hover:text-zinc-950",
  info: "border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-zinc-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-zinc-950",
};

interface Options {
  tone?: ActionButtonTone;
  fullWidth?: boolean;
  className?: string;
}

export function actionButtonClasses({
  tone = "default",
  fullWidth = false,
  className,
}: Options = {}) {
  return twMerge(
    "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
    fullWidth ? "w-full" : "w-auto",
    TONE_CLASSES[tone],
    className,
  );
}
