import { toast } from "webcoreui";
import { useStore } from "zustand";

import ConfirmModal from "@/components/Forms/ConfirmModal";
import { budgetStore } from "@/stores/budgetStore";

const BudgetActions = () => {
  const id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  const budget = useStore(budgetStore, (s) => s.budgets.find((b) => b.budget.id === id));

  if (!budget) return null;

  const handleDelete = async () => {
    await budgetStore.getState().remove(budget.budget.id);
    toast("#budget-deleted");
    window.history.back();
  };

  return (
    <li className="text-sm">
      <ConfirmModal
        onConfirm={handleDelete}
        buttonTitle="Eliminar"
        modalId={`delete-budget-${id}`}
        modalTitle="Confirmar eliminación de presupuesto"
        description="¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer."
        theme="alert"
        buttonClassName="focus-ring min-h-10 rounded-lg border border-red-600 px-4 py-2 font-medium text-red-600 dark:border-red-400 dark:text-red-400"
      />
    </li>
  );
};

export default BudgetActions;
