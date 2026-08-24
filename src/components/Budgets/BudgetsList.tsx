import EmptyState from "@/components/General/EmptyState";
import { useBudgets } from "@/hooks/useStores";
import BudgetCard from "./BudgetCard";

export default function BudgetsList() {
  const budgets = useBudgets((state) => state.budgets);
  if (!budgets.length) return <EmptyState title="Aún no tienes presupuestos." description="Crea un límite para dar seguimiento a una categoría de gastos." />;
  return <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">{budgets.map((item) => <li key={item.budget.id} className="min-w-0"><BudgetCard budget={item} /></li>)}</ul>;
}
