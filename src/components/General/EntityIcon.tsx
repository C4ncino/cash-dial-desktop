import { Icon } from "@iconify/react";
import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Props = Omit<HTMLAttributes<HTMLSpanElement>, "color"> & {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  shape?: "square" | "circle";
  label?: string;
  decorative?: boolean;
};

const sizes = {
  sm: "size-8 p-1",
  md: "size-10 p-1.5",
  lg: "size-12 p-2",
  xl: "size-14 p-2",
} as const;

export default function EntityIcon({
  icon,
  color,
  size = "md",
  shape = "square",
  label,
  decorative = !label,
  className,
  style,
  ...props
}: Props) {
  return (
    <span
      {...props}
      className={twMerge(
        "inline-flex shrink-0 items-center justify-center",
        sizes[size],
        shape === "circle" ? "rounded-full" : "rounded-md",
        className,
      )}
      style={{ backgroundColor: color, ...style }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? "true" : undefined}
    >
      <Icon icon={icon.startsWith("iconoir:") ? icon : `iconoir:${icon}`} className="size-full text-white" />
    </span>
  );
}
