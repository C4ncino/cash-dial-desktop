import { Icon } from "@iconify/react";

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
          className="size-4 shrink-0 text-zinc-400"
          aria-hidden="true"
        />
      )}
      <span className="truncate">{label ?? fallback}</span>
    </span>
  );
}
