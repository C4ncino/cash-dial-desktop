import { useStore } from "zustand";

import { budgetStore } from "@/stores/budgetStore";

import BudgetCard from "./BudgetCard";

const BudgetsList = () => {
  const budgets = useStore(budgetStore, (state) => state.budgets);

  if (!budgets || budgets.length === 0) {
    return (
      <div className="glass-surface rounded-xl border-dashed p-8 text-center">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">Aún no tienes presupuestos.</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Crea un límite para dar seguimiento a una categoría de gastos.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {budgets.map((b) => (
        <li key={b.budget.id} className="min-w-0">
          <BudgetCard budget={b} />
        </li>
      ))}
    </ul>
  );
};

export default BudgetsList;
