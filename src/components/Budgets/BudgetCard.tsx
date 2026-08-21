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
      className="glass-surface mx-auto w-full max-w-2xl rounded-md p-3 py-3 transition-all hover:ring-1 hover:ring-zinc-400 dark:hover:ring-zinc-600"
      aria-label={`Abrir presupuesto ${budget.budget.name}`}
    >
      <hgroup className="flex flex-row gap-2 items-center mb-2">
        {category && (
          <SquareIcon
            data-testid="square-icon"
            className="w-10 h-10"
            backgroundColor={category.color}
            icon={category.icon}
          />
        )}

        <div>
          <h3 className="line-clamp-1 flex-1 text-lg font-medium text-zinc-950 dark:text-zinc-100">
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
