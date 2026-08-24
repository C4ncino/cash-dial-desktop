import { Icon } from "@iconify/react";
import { twMerge } from "tailwind-merge";

import { formatAmount, formatNumber, formatShortAmount } from "@/lib/formatters";

export type AmountTone = "income" | "expense" | "neutral" | "warning";
export type AmountFormat = "number" | "short" | "currency";
export type AmountIcon = "plus" | "minus" | "none";

interface Props {
  amount: number;
  tone?: AmountTone;
  format?: AmountFormat;
  icon?: AmountIcon;
  currency?: Currency;
  className?: string;
  amountClassName?: string;
  inline?: boolean;
  maximum?: number;
}

const toneClasses: Record<AmountTone, string> = {
  income: "text-green-600 dark:text-green-400",
  expense: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  neutral: "text-zinc-950 dark:text-zinc-100",
};

export default function AmountText({
  amount,
  tone = "neutral",
  format = "number",
  icon = "none",
  currency,
  className,
  amountClassName,
  inline = false,
  maximum = 1000,
}: Props) {
  const formattedAmount =
    format === "short"
      ? formatShortAmount(amount)
      : format === "currency" && currency
        ? formatAmount(amount, currency)
        : formatNumber(amount, maximum);
  if (inline)
    return (
      <strong
        className={twMerge(
          "tabular-nums font-semibold",
          toneClasses[tone],
          className,
          amountClassName,
        )}
      >
        {formattedAmount}
      </strong>
    );
  return (
    <span
      className={twMerge(
        "inline-flex min-w-0 items-baseline tabular-nums",
        inline ? "font-semibold" : "text-2xl",
        toneClasses[tone],
        className,
      )}
    >
      {icon !== "none" && (
        <Icon
          icon={`iconoir:${icon}`}
          className="mr-0.5 size-[1em] shrink-0 self-center"
          aria-hidden="true"
        />
      )}
      <strong
        className={twMerge("min-w-0 break-words font-semibold", toneClasses[tone], amountClassName)}
      >
        {formattedAmount}
      </strong>
    </span>
  );
}
