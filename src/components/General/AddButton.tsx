import type { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function AddButton({ className, children, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={twMerge(
        "focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-400 dark:text-zinc-950 dark:hover:bg-green-500",
        className,
      )}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5 fill-none"
        aria-hidden="true"
        data-icon="iconoir:plus"
      >
        <path
          d="M12 6v12M6 12h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </button>
  );
}
