import { useStore } from "zustand";

import { budgetStore } from "@/stores/budgetStore";

import BudgetCard from "./BudgetCard";

const BudgetsList = () => {
  const budgets = useStore(budgetStore, (state) => state.budgets);

  if (!budgets || budgets.length === 0) return null;

  return (
    <>
      {budgets.map((b) => (
        <BudgetCard key={b.budget.id} budget={b} />
      ))}
    </>
  );
};

export default BudgetsList;
