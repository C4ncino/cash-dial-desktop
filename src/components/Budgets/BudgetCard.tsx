import SquareIcon from "@/components/General/SquareIcon";
import { budgetStore } from "@/stores/budgetStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";

import BudgetMeter from "./BudgetMeter";

interface Props {
  budget: BudgetDetails;
}

const BudgetCard = ({ budget }: Props) => {
  const category = categoryStore.getState().getById(budget.budget.categoryId);
  const currency = currencyStore.getState().getById(budget.budget.currencyId) as
    | Currency
    | undefined;

  const periodTypes = budgetStore.getState().periodTypes;
  const periodType = periodTypes.find((p) => p.id === budget.budget.budgetPeriodTypeId);

  const currentPeriod = budget.periods[budget.periods.length - 1];

  if (!currentPeriod) return null;

  return (
    <a
      href={`/budget?id=${budget.budget.id}`}
      className="focus-ring glass-surface block w-full min-w-0 rounded-xl p-4 transition-colors hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
      aria-label={`Abrir presupuesto ${budget.budget.name}`}
    >
      <hgroup className="mb-3 flex min-w-0 flex-row items-center gap-3">
        {category && (
          <SquareIcon
            data-testid="square-icon"
            className="w-10 h-10"
            backgroundColor={category.color}
            icon={category.icon}
          />
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-medium text-zinc-950 dark:text-zinc-100">
            {budget.budget.name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {periodType ? periodType.name : "-"}
          </p>
        </div>
      </hgroup>

      <BudgetMeter
        spent={currentPeriod.amountSpend}
        limit={currentPeriod.amountLimit}
        currencyCode={currency?.code || ""}
      />
    </a>
  );
};

export default BudgetCard;
