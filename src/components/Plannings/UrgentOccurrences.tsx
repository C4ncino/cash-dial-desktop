import { useMemo } from "react";
import { useStore } from "zustand";

import UrgentOccurrenceCard from "@/components/Plannings/UrgentOccurrenceCard";
import { isOccurrenceOverdue, planningsStore } from "@/stores/planningsStore";
import { PLANNING_STATUS } from "@/types/enums";

export function getActionableOccurrence(
  planning: Planning,
  occurrencesByPlanning: Record<number, PlanningOccurrence[]> = {},
): PlanningOccurrence | undefined {
  const pending = (occurrencesByPlanning[planning.id] ?? [])
    .filter((occurrence) => occurrence.statusId === PLANNING_STATUS.PENDING)
    .sort((a, b) => a.expectedDate - b.expectedDate);

  return pending[0] ?? (planning.currentOccurrence?.statusId === PLANNING_STATUS.PENDING
    ? planning.currentOccurrence
    : undefined);
}

export function getUrgentPlannings(
  plannings: Planning[],
  occurrencesByPlanning: Record<number, PlanningOccurrence[]> = {},
): Array<{ planning: Planning; occurrence: PlanningOccurrence }> {
  return plannings
    .filter((planning) => planning.recurringRule.isActive)
    .map((planning) => ({ planning, occurrence: getActionableOccurrence(planning, occurrencesByPlanning) }))
    .filter((item): item is { planning: Planning; occurrence: PlanningOccurrence } => Boolean(item.occurrence))
    .sort((a, b) => {
      const overdue = Number(b.occurrence.isOverdue || isOccurrenceOverdue(b.occurrence)) - Number(a.occurrence.isOverdue || isOccurrenceOverdue(a.occurrence));
      return overdue || a.occurrence.expectedDate - b.occurrence.expectedDate || a.planning.id - b.planning.id;
    });
}

const UrgentOccurrences = () => {
  const plannings = useStore(planningsStore, (state) => state.plannings ?? []);
  const occurrencesByPlanning = useStore(planningsStore, (state) => state.occurrencesByPlanning ?? {});
  const urgent = useMemo(() => getUrgentPlannings(plannings, occurrencesByPlanning), [plannings, occurrencesByPlanning]);

  return (
    <section aria-labelledby="urgent-occurrences-title" className="space-y-3">
      <h2 id="urgent-occurrences-title" className="text-xl font-semibold">Próximas Planeaciones</h2>
      {urgent.length === 0 ? (
        <p data-testid="urgent-empty-state" className="glass-surface rounded-xl border-dashed p-6 text-sm text-zinc-500 dark:text-zinc-400">
          No hay ocurrencias pendientes.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {urgent.map(({ planning, occurrence }) => (
            <UrgentOccurrenceCard key={occurrence.id} planning={planning} occurrence={occurrence} />
          ))}
        </div>
      )}
    </section>
  );
};

export default UrgentOccurrences;
