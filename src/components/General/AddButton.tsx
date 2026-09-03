import type { ButtonHTMLAttributes } from "react";

import ActionButton from "@/components/General/ActionButton";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function AddButton({ className, children, type = "button", ...props }: Props) {
  return (
    <ActionButton type={type} tone="primary" className={className} {...props}>
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
    </ActionButton>
  );
}
