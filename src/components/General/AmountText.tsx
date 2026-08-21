import { Icon } from "@iconify/react";

import { formatAmount, formatNumber, formatShortAmount } from "@/lib/formatters";

export type AmountTone = "income" | "expense" | "neutral";
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
}

const AmountText = ({
  amount,
  tone = "neutral",
  format = "number",
  icon = "none",
  currency,
  className = "",
  amountClassName = "",
  inline = false,
}: Props) => {
  const toneClass = tone === "income"
    ? "text-green-600 dark:text-green-400"
    : tone === "expense"
      ? "text-red-600 dark:text-red-400"
      : "text-zinc-950 dark:text-zinc-100";

  const formattedAmount = format === "short"
    ? formatShortAmount(amount)
    : format === "currency" && currency
      ? formatAmount(amount, currency)
      : formatNumber(amount, 1000);

  if (inline) {
    return <strong className={className}>{formattedAmount}</strong>;
  }

  return (
    <div className={`text-2xl flex flex-row ${toneClass} ${className}`}>
      {icon !== "none" && (
        <Icon
          icon={`iconoir:${icon}`}
          className="mt-1"
        />
      )}
      <p className={`font-semibold ${amountClassName}`}>{formattedAmount}</p>
    </div>
  );
};

export default AmountText;
