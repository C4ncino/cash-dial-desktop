import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ title, description, icon, action, className = "" }: Props) {
  return (
    <div
      className={`glass-surface space-y-2 rounded-xl border-dashed p-8 text-center ${className}`}
    >
      {icon}
      <p className="font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description && <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      {action}
    </div>
  );
}
