import { toast } from "webcoreui";
import { useStore } from "zustand";

import ConfirmModal from "@/components/Forms/ConfirmModal";
import { planningsStore } from "@/stores/planningsStore";

interface Props {
  planningId?: number;
}

const PlanningActions = ({ planningId: propPlanningId }: Props) => {
  const queryId = typeof window !== "undefined"
    ? Number(new URLSearchParams(window.location.search).get("id"))
    : NaN;
  const planningId = propPlanningId ?? queryId;
  const planning = useStore(planningsStore, (s) => s.plannings.find((item) => item.id === planningId));

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
    <div className="flex flex-col gap-3 text-sm" data-testid="planning-actions">
      <ConfirmModal
        onConfirm={handleStatusChange}
        buttonTitle={isActive ? "Desactivar" : "Activar"}
        modalId={statusModalId}
        modalTitle={isActive ? "Confirmar desactivación" : "Confirmar activación"}
        description={isActive
          ? "La planificación dejará de generar ocurrencias pendientes hasta que la actives de nuevo."
          : "La planificación volverá a generar ocurrencias pendientes según su regla de recurrencia."}
        theme="warning"
        buttonClassName={isActive ? "text-zinc-300" : "text-emerald-400"}
      />
      <ConfirmModal
        onConfirm={handleDelete}
        buttonTitle="Eliminar"
        modalId={`delete-planning-${planning.id}`}
        modalTitle="Confirmar eliminación de planificación"
        description="¿Estás seguro de que deseas eliminar esta planificación? Sus movimientos históricos no se eliminarán."
        theme="alert"
        buttonClassName="text-red-500 font-medium"
      />
    </div>
  );
};

export default PlanningActions;
