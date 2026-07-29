import { Icon } from "@iconify/react";
import { useEffect, useMemo } from "react";
import { useStore } from "zustand";

import MovementList from "@/components/Movements/MovementList";
import useIterator from "@/hooks/usePagination";
import { budgetStore } from "@/stores/budgetStore";
import { currencyStore } from "@/stores/currencyStore";

import BudgetMeter from "./BudgetMeter";

const BudgetPeriods = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  const budget = useStore(budgetStore, (s) => s.budgets.find((b) => b.budget.id === id));
  const currency = currencyStore.getState().getById(budget?.budget.currencyId || 0) as
    | Currency
    | undefined;

  const lastIndex = useMemo(() => {
    const last = budget?.periods.length ? budget?.periods.length - 1 : 0;

    return last;
  }, [budget]);

  const { current, isFirst, isLast, next, prev, set } = useIterator(lastIndex);

  useEffect(() => {
    set(lastIndex);
  }, [lastIndex]);

  if (!budget) return null;

  const period = budget.periods[current];

  const startDate = new Date(period.startDate);
  const endDate = new Date(period.endDate);

  return (
    <section className="space-y-2">
      <header className="space-y-4">
        <menu className="flex justify-between text-white">
          <button
            className="flex items-center italic transition-all duration-200 hover:text-zinc-300 hover:opacity-90 disabled:text-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            onClick={prev}
            disabled={isFirst}
          >
            <Icon icon="iconoir:nav-arrow-left" className="w-6 h-6" />
            Anterior
          </button>

          <h2>
            <time dateTime={startDate.toISOString().split("T")[0]}>
              {startDate.toLocaleDateString()}
            </time>{" "}
            &mdash;{" "}
            <time dateTime={endDate.toISOString().split("T")[0]}>
              {endDate.toLocaleDateString()}
            </time>
          </h2>

          <button
            className="flex items-center italic transition-all duration-200 hover:text-zinc-300 hover:opacity-90 disabled:text-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            onClick={next}
            disabled={isLast}
          >
            Siguiente
            <Icon icon="iconoir:nav-arrow-right" className="w-6 h-6" />
          </button>
        </menu>

        <BudgetMeter
          spent={period.amountSpend}
          limit={period.amountLimit}
          currencyCode={currency?.code || ""}
        />
      </header>

      <h2 className="text-xl mb-2">Movimientos</h2>
      {period.movementIds.length === 0 ? (
        <p className="py-4 text-center text-zinc-500 text-sm">
          No hay movimientos en este periodo.
        </p>
      ) : (
        <MovementList movementIds={period.movementIds.reverse()} needCompact />
      )}
    </section>
  );
};

export default BudgetPeriods;
