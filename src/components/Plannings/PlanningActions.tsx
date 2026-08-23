import { toast } from "webcoreui";
import { useStore } from "zustand";

import ConfirmModal from "@/components/Forms/ConfirmModal";
import { planningsStore } from "@/stores/planningsStore";

interface Props {
  planningId?: number;
}

const PlanningActions = ({ planningId: propPlanningId }: Props) => {
  const queryId =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : NaN;
  const planningId = propPlanningId ?? queryId;
  const planning = useStore(planningsStore, (s) =>
    s.plannings.find((item) => item.id === planningId),
  );

  if (!planning) return null;

  const isActive = planning.recurringRule.isActive;
  const statusModalId = `${isActive ? "deactivate" : "activate"}-planning-${planning.id}`;

  const handleStatusChange = async () => {
    if (isActive) {
      await planningsStore.getState().deactivate(planning.id);
      toast("#planning-deactivated");
    } else {
      await planningsStore.getState().activate(planning.id);
      toast("#planning-activated");
    }
  };

  const handleDelete = async () => {
    await planningsStore.getState().remove(planning.id);
    toast("#planning-deleted");
    window.history.back();
  };

  return (
    <>
      <li>
        <ConfirmModal
          onConfirm={handleStatusChange}
          buttonTitle={isActive ? "Desactivar" : "Activar"}
          modalId={statusModalId}
          modalTitle={isActive ? "Confirmar desactivación" : "Confirmar activación"}
          description={
            isActive
              ? "La planificación dejará de generar ocurrencias pendientes hasta que la actives de nuevo."
              : "La planificación volverá a generar ocurrencias pendientes según su regla de recurrencia."
          }
          theme="warning"
          buttonClassName={`focus-ring min-h-10 rounded-lg border px-4 py-2 font-medium ${isActive ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400" : "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"}`}
        />
      </li>
      <li>
        <ConfirmModal
          onConfirm={handleDelete}
          buttonTitle="Eliminar"
          modalId={`delete-planning-${planning.id}`}
          modalTitle="Confirmar eliminación de planificación"
          description="¿Estás seguro de que deseas eliminar esta planificación? Sus movimientos históricos no se eliminarán."
          theme="alert"
          buttonClassName="focus-ring min-h-10 rounded-lg border border-red-600 px-4 py-2 font-medium text-red-600 dark:border-red-400 dark:text-red-400"
        />
      </li>
    </>
  );
};

export default PlanningActions;
