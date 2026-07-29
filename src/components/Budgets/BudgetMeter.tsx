import colors from "tailwindcss/colors";
import { Progress } from "webcoreui/react";

import { formatNumber } from "@/lib/formatters";

interface Props {
  spent: number;
  limit: number;
  currencyCode: string;
}

const getColor = (percentage: number) => {
  if (percentage < 25) return colors.green[600];
  if (percentage <= 50) return colors.lime[500];
  if (percentage <= 75) return colors.amber[400];
  if (percentage < 90) return colors.orange[400];
  if (percentage < 100) return colors.red[500];
  else return colors.red[600];
};

const BudgetMeter = ({ spent, limit, currencyCode }: Props) => {
  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const remaining = limit - spent;
  const isOverBudget = spent >= limit;
  return (
    <>
      <div className="flex justify-between items-baseline mb-1">
        <p className={`text-lg font-semibold ${isOverBudget ? "text-red-500" : "dark:text-white"}`}>
          {formatNumber(spent, 999_999)}
        </p>
        <p className="text-sm text-zinc-400 text-right">
          / {formatNumber(limit, 999_999)} {currencyCode}
        </p>
      </div>

      <Progress
        value={percentage}
        color={getColor(percentage)}
        background={colors.zinc[700]}
        className="mb-2"
      />

      <p
        className={`text-xs text-right ${isOverBudget ? "text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        {isOverBudget
          ? `Excedido por ${formatNumber(Math.abs(remaining), 999_999)}`
          : `${formatNumber(remaining, 999_999)} restante`}
      </p>
    </>
  );
};

export default BudgetMeter;
