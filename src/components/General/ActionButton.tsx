import type { ButtonHTMLAttributes } from "react";

import {
  type ActionButtonTone,
  actionButtonClasses,
} from "@/components/General/actionButtonStyles";

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ActionButtonTone;
  fullWidth?: boolean;
}

export default function ActionButton({
  tone = "default",
  fullWidth = false,
  className,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={actionButtonClasses({ tone, fullWidth, className })}
      {...props}
    />
  );
}
