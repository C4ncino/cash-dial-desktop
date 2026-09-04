import { Icon } from "@iconify/react";
import { twMerge } from "tailwind-merge";

import { isTransferIcon } from "@/lib/icons";

interface Props {
  label?: string;
  icon?: string;
  color?: string;
  fallback?: string;
  className?: string;
}

export default function EntityLabel({ label, icon, color, fallback = "—", className = "" }: Props) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      {icon && (
        <Icon
          icon={icon.startsWith("iconoir:") ? icon : `iconoir:${icon}`}
          style={color ? { color } : undefined}
          className={twMerge(
            "size-4 shrink-0 text-zinc-400",
            isTransferIcon(icon) && "rotate-90",
          )}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{label ?? fallback}</span>
    </span>
  );
}
