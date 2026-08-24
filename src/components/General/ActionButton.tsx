import type { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Tone = "default" | "success" | "warning" | "danger";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  default:
    "border-zinc-400 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700",
  success:
    "border-green-600 bg-green-600 text-zinc-50 hover:border-green-500 hover:bg-green-500 dark:border-green-400 dark:bg-green-400 dark:text-zinc-950",
  warning:
    "border-amber-600 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950",
  danger:
    "border-red-600 text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950",
};

export default function ActionButton({ tone = "default", className, ...props }: Props) {
  return (
    <button
      className={twMerge(
        "focus-ring min-h-11 rounded-lg border-2 px-4 py-2 font-medium hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
