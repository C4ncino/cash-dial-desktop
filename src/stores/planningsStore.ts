import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { planningsCommands } from "@/services/tauri/plannings";
import { PLANNING_STATUS } from "@/types/enums";

export function getActionableOccurrence(planning: Planning): PlanningOccurrence | undefined {
  return planning.currentOccurrence ?? undefined;
}

export function isOccurrenceOverdue(
  occurrence: PlanningOccurrence,
  todayStartMs = new Date().setHours(0, 0, 0, 0),
): boolean {
  return occurrence.statusId === PLANNING_STATUS.PENDING && occurrence.expectedDate < todayStartMs;
}

export const planningsStore = createStore<PlanningsStore & PlanningActions>((set, get) => {
  const refreshOccurrencesAfterMutation = async (planningId: number) => {
    try {
      await get().getOccurrences(planningId);
    } catch (error) {
      // The planning mutation already succeeded. Keep that result instead of
      // making callers retry it just because the follow-up refresh failed.
      logger.warn(`Failed to refresh occurrences for planning ${planningId}`, error);
    }
  };

  return {
    plannings: [] as Planning[],
    recurringTypes: [] as PlanningRecurringType[],
    statuses: [] as PlanningStatus[],
    occurrencesByPlanning: {} as Record<number, PlanningOccurrence[]>,

    populate: async () => {
      const recurringTypes = await planningsCommands.getRecurringTypes();
      const statuses = await planningsCommands.getStatuses();
      const plannings = await planningsCommands.getAll();

      logger.debug("Plannings:", plannings);
      logger.debug("Planning recurring types:", recurringTypes);
      logger.debug("Planning statuses:", statuses);

      return set({
        plannings,
        recurringTypes,
        statuses,
      });
    },

    getById: (id: number) => get().plannings.find((p) => p.id === id),

    get: async (id: number) => {
      const planning = await planningsCommands.get(id);

      set((state) => ({
        plannings: state.plannings.some((item) => item.id === id)
          ? state.plannings.map((item) => (item.id === id ? planning : item))
          : [planning, ...state.plannings],
      }));

      return planning;
    },

    getOccurrences: async (planningId: number) => {
      const occurrences = await planningsCommands.getOccurrences(planningId);

      logger.debug(`Occurrences for planning ${planningId}:`, occurrences);

      set((state) => ({
        occurrencesByPlanning: {
          ...state.occurrencesByPlanning,
          [planningId]: occurrences,
        },
      }));

      return occurrences;
    },

    create: async (request: CreatePlanningRequest) => {
      const newPlanning = await planningsCommands.create(request);

      logger.info("Planning created", newPlanning);

      set((state) => ({
        plannings: [newPlanning, ...state.plannings],
      }));

      return newPlanning;
    },

    update: async (id: number, request: UpdatePlanningRequest) => {
      const updatedPlanning = await planningsCommands.update(id, request);

      logger.info("Planning updated", updatedPlanning);

      set((state) => ({
        plannings: state.plannings.map((p) => (p.id === id ? updatedPlanning : p)),
      }));

      await refreshOccurrencesAfterMutation(id);

      return updatedPlanning;
    },

    remove: async (id: number) => {
      await planningsCommands.remove(id);

      logger.info("Planning deleted", { id });

      set((state) => {
        const occurrencesByPlanning = { ...state.occurrencesByPlanning };
        delete occurrencesByPlanning[id];

        return {
          plannings: state.plannings.filter((p) => p.id !== id),
          occurrencesByPlanning,
        };
      });
    },

    activate: async (id: number) => {
      const updatedPlanning = await planningsCommands.activate(id);

      logger.info("Planning activated", updatedPlanning);

      set((state) => ({
        plannings: state.plannings.map((p) => (p.id === id ? updatedPlanning : p)),
      }));

      await refreshOccurrencesAfterMutation(id);

      return updatedPlanning;
    },

    deactivate: async (id: number) => {
      const updatedPlanning = await planningsCommands.deactivate(id);

      logger.info("Planning deactivated", updatedPlanning);

      set((state) => ({
        plannings: state.plannings.map((p) => (p.id === id ? updatedPlanning : p)),
      }));

      await refreshOccurrencesAfterMutation(id);

      return updatedPlanning;
    },

    cancelOccurrence: async (occurrenceId: number, planningId: number) => {
      const updatedOccurrence = await planningsCommands.cancelOccurrence(occurrenceId);

      logger.info("Planning occurrence canceled", updatedOccurrence);

      const updatedPlanning = await planningsCommands.get(planningId);

      set((state) => {
        const currentOccs = state.occurrencesByPlanning[planningId] || [];
        return {
          plannings: state.plannings.map((p) => (p.id === planningId ? updatedPlanning : p)),
          occurrencesByPlanning: {
            ...state.occurrencesByPlanning,
            [planningId]: currentOccs.map((occ) =>
              occ.id === occurrenceId ? updatedOccurrence : occ,
            ),
          },
        };
      });

      return updatedOccurrence;
    },

    completeOccurrence: async (occurrenceId: number, movementId: number, planningId: number) => {
      const updatedOccurrence = await planningsCommands.completeOccurrence(
        occurrenceId,
        movementId,
      );

      logger.info("Planning occurrence completed", updatedOccurrence);

      const updatedPlanning = await planningsCommands.get(planningId);

      set((state) => {
        const currentOccs = state.occurrencesByPlanning[planningId] || [];
        return {
          plannings: state.plannings.map((p) => (p.id === planningId ? updatedPlanning : p)),
          occurrencesByPlanning: {
            ...state.occurrencesByPlanning,
            [planningId]: currentOccs.map((occ) =>
              occ.id === occurrenceId ? updatedOccurrence : occ,
            ),
          },
        };
      });

      return updatedOccurrence;
    },

    refresh: async (id: number) => {
      try {
        const updatedPlanning = await planningsCommands.get(id);

        logger.debug("Planning refreshed", updatedPlanning);

        set((state) => ({
          plannings: state.plannings.map((p) => (p.id === id ? updatedPlanning : p)),
        }));

        return updatedPlanning;
      } catch (err) {
        logger.error("Failed to refresh planning", err);
        return undefined;
      }
    },
  };
});
