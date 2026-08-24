import EntityIcon from "@/components/General/EntityIcon";
import InteractiveCard from "@/components/General/InteractiveCard";
import { useBudgets, useCategories, useCurrencies } from "@/hooks/useStores";

import BudgetMeter from "./BudgetMeter";

interface Props {
  budget: BudgetDetails;
}

const BudgetCard = ({ budget }: Props) => {
  const category = useCategories((state) => state.getById(budget.budget.categoryId));
  const currency = useCurrencies((state) => state.getById(budget.budget.currencyId));
  const periodTypes = useBudgets((state) => state.periodTypes);
  const periodType = periodTypes.find((p) => p.id === budget.budget.budgetPeriodTypeId);

  const currentPeriod = budget.periods[budget.periods.length - 1];

  if (!currentPeriod) return null;

  return (
    <InteractiveCard
      href={`/budget?id=${budget.budget.id}`}
      aria-label={`Abrir presupuesto ${budget.budget.name}`}
    >
      <hgroup className="mb-3 flex min-w-0 flex-row items-center gap-3">
        {category && (
          <EntityIcon
            data-testid="square-icon"
            size="md"
            color={category.color}
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
    </InteractiveCard>
  );
};

export default BudgetCard;
