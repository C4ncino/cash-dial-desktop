import type { AnchorHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
}

export default function InteractiveCard({ children, className, ...props }: Props) {
  return (
    <a
      className={twMerge(
        "focus-ring glass-surface block w-full min-w-0 rounded-xl p-4 transition-colors hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
