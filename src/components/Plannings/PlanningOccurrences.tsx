import { Icon } from "@iconify/react";
import { useEffect } from "react";
import { toast } from "webcoreui";
import { useStore } from "zustand";

import ConfirmModal from "@/components/Forms/ConfirmModal";
import { formatOccurrenceDate } from "@/components/Plannings/PlanningCard";
import PlanningStatusBadge from "@/components/Plannings/PlanningStatusBadge";
import { formatNumber } from "@/lib/formatters";
import { planningsStore } from "@/stores/planningsStore";
import { MOVEMENT_TYPES, PLANNING_STATUS } from "@/types/enums";

interface Props {
  planningId?: number;
}

const EMPTY_OCCURRENCES: PlanningOccurrence[] = [];

const occurrenceLabel = (occurrence: PlanningOccurrence) => {
  if (occurrence.statusId === PLANNING_STATUS.COMPLETED) return "Completada";
  if (occurrence.statusId === PLANNING_STATUS.CANCELED) return "Cancelada";
  return "Pendiente";
};

const PlanningOccurrences = ({ planningId: propPlanningId }: Props) => {
  const queryId =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : NaN;
  const planningId = propPlanningId ?? queryId;
  const planning = useStore(planningsStore, (s) =>
    s.plannings.find((item) => item.id === planningId),
  );
  const occurrences = useStore(
    planningsStore,
    (s) => s.occurrencesByPlanning[planningId] ?? EMPTY_OCCURRENCES,
  );

  useEffect(() => {
    if (!Number.isFinite(planningId)) return;

    let cancelled = false;

    const loadPlanningOccurrences = async () => {
      const store = planningsStore.getState();

      // Detail pages can hydrate before the layout's async store initialization
      // completes. Load this planning directly, then request its full history.
      await store.get(planningId);

      if (!cancelled) {
        await planningsStore.getState().getOccurrences(planningId);
      }
    };

    void loadPlanningOccurrences();

    return () => {
      cancelled = true;
    };
  }, [planningId]);

  useEffect(() => {
    if (!Number.isFinite(planningId)) return;
    const handleUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ planningId?: number }>).detail;
      if (detail.planningId !== planningId) return;
      void planningsStore
        .getState()
        .get(planningId)
        .then(() => planningsStore.getState().getOccurrences(planningId));
    };
    window.addEventListener("planning:occurrence-updated", handleUpdated);
    return () => window.removeEventListener("planning:occurrence-updated", handleUpdated);
  }, [planningId]);

  if (!planning) return null;

  const currentOccurrence = planning.currentOccurrence;
  const cancelModalId = `cancel-planning-occurrence-${planning.id}-${currentOccurrence?.id ?? "none"}`;

  const handleComplete = () => {
    if (!currentOccurrence) return;
    window.dispatchEvent(
      new CustomEvent("planning:movement-create", {
        detail: {
          planningId: planning.id,
          occurrenceId: currentOccurrence.id,
          typeId: planning.typeId,
          amount: planning.amount,
          expectedDate: currentOccurrence.expectedDate,
        },
      }),
    );
  };

  const handleCancel = async () => {
    if (!currentOccurrence) return;
    await planningsStore.getState().cancelOccurrence(currentOccurrence.id, planning.id);
    await planningsStore.getState().getOccurrences(planning.id);
    toast("#occurrence-canceled");
  };

  return (
    <section className="p-4 mb-4" data-testid="planning-occurrences">
      <h3 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-100">Ocurrencias</h3>

      {currentOccurrence ? (
        <article className="glass-surface mb-5 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Ocurrencia actual</p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                {formatOccurrenceDate(currentOccurrence.expectedDate)}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {planning.typeId === MOVEMENT_TYPES.EXPENSE ? "Gasto" : "Ingreso"} de{" "}
                {formatNumber(planning.amount, 999_999)}
              </p>
            </div>
            <PlanningStatusBadge
              occurrence={currentOccurrence}
              isActive={planning.recurringRule.isActive}
            />
          </div>
          {currentOccurrence.statusId === PLANNING_STATUS.PENDING && (
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                type="button"
                data-testid="complete-occurrence-button"
                onClick={handleComplete}
                className="rounded border border-emerald-600 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50/60 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
              >
                Completar con movimiento
              </button>
              <ConfirmModal
                onConfirm={handleCancel}
                buttonTitle="Cancelar ocurrencia"
                modalId={cancelModalId}
                modalTitle="Confirmar cancelación de ocurrencia"
                description="¿Estás seguro de que deseas cancelar esta ocurrencia?"
                theme="alert"
                buttonClassName="rounded border border-red-600 px-3 py-2 text-sm text-red-600 hover:bg-red-50/60 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950/60"
              />
            </div>
          )}
        </article>
      ) : (
        <p className="text-sm text-zinc-500 mb-5">No hay una ocurrencia pendiente.</p>
      )}

      <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Historial</h4>
      {occurrences.length === 0 ? (
        <p className="text-sm text-zinc-500">Aún no hay historial de ocurrencias.</p>
      ) : (
        <ol className="space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
          {occurrences.map((occurrence) => (
            <li key={occurrence.id} className="glass-surface relative rounded-lg p-3">
              <p
                className={`flex items-center gap-2 text-sm font-medium ${occurrence.statusId === PLANNING_STATUS.COMPLETED ? "text-emerald-600 dark:text-emerald-400" : occurrence.statusId === PLANNING_STATUS.CANCELED ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
              >
                <Icon
                  icon={
                    occurrence.statusId === PLANNING_STATUS.COMPLETED
                      ? "iconoir:check-circle"
                      : occurrence.statusId === PLANNING_STATUS.CANCELED
                        ? "iconoir:cancel"
                        : "iconoir:clock"
                  }
                  className="h-4 w-4"
                />
                {occurrenceLabel(occurrence)}
              </p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {formatOccurrenceDate(occurrence.expectedDate)}
              </p>
              {occurrence.statusId === PLANNING_STATUS.COMPLETED && occurrence.movementId && (
                <a
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  href={`/movement?id=${occurrence.movementId}`}
                >
                  Ver movimiento
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default PlanningOccurrences;
