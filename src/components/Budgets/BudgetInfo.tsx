import { useMemo } from "react";
import { useStore } from "zustand";

import SquareIcon from "@/components/General/SquareIcon";
import { formatNumber } from "@/lib/formatters";
import { budgetStore } from "@/stores/budgetStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";

const BudgetInfo = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  const budget = useStore(budgetStore, (s) => s.budgets.find((b) => b.budget.id === id));

  const category = useStore(categoryStore, (s) =>
    budget ? s.getById(budget.budget.categoryId) : undefined,
  );
  const currency = useStore(currencyStore, (s) =>
    budget ? s.getById(budget.budget.currencyId) : undefined,
  ) as Currency | undefined;

  const periodType = useMemo(() => {
    if (!budget) return undefined;
    return budgetStore
      .getState()
      .periodTypes.find((p) => p.id === budget.budget.budgetPeriodTypeId);
  }, [budget]);

  if (!budget) return;

  const current = budget.periods[budget.periods.length - 1];

  return (
    <section className="mb-4 flex items-center gap-4 p-4">
      {category && (
        <SquareIcon
          data-testid="square-icon"
          className="w-12 h-12"
          backgroundColor={category.color}
          icon={category.icon}
        />
      )}

      <div className="flex-1">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-100">{budget.budget.name}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{periodType?.name ?? "-"}</p>
      </div>

      <div className="text-right">
        <p className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
          {formatNumber(current.amountLimit, 999_999)}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{currency?.code ?? ""}</p>
      </div>
    </section>
  );
};

export default BudgetInfo;
