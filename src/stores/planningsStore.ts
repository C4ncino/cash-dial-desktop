import { invoke } from "@tauri-apps/api/core";
import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { PLANNING_FUNCTIONS, PLANNING_STATUS } from "@/types/enums";

export function getActionableOccurrence(planning: Planning): PlanningOccurrence | undefined {
  return planning.currentOccurrence ?? undefined;
}

export function isOccurrenceOverdue(
  occurrence: PlanningOccurrence,
  todayStartMs = new Date().setHours(0, 0, 0, 0),
): boolean {
  return occurrence.statusId === PLANNING_STATUS.PENDING && occurrence.expectedDate < todayStartMs;
}

export const planningsStore = createStore<PlanningsStore & PlanningActions>((set, get) => ({
  plannings: [] as Planning[],
  recurringTypes: [] as PlanningRecurringType[],
  statuses: [] as PlanningStatus[],
  occurrencesByPlanning: {} as Record<number, PlanningOccurrence[]>,

  populate: async () => {
    const recurringTypes = (await invoke(
      PLANNING_FUNCTIONS.getRecurringTypes,
    )) as PlanningRecurringType[];
    const statuses = (await invoke(PLANNING_FUNCTIONS.getStatuses)) as PlanningStatus[];
    const plannings = (await invoke(PLANNING_FUNCTIONS.getAll)) as Planning[];

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
    const planning = (await invoke(PLANNING_FUNCTIONS.get, {
      planningId: id,
    })) as Planning;

    set((state) => ({
      plannings: state.plannings.some((item) => item.id === id)
        ? state.plannings.map((item) => (item.id === id ? planning : item))
        : [planning, ...state.plannings],
    }));

    return planning;
  },

  getOccurrences: async (planningId: number) => {
    const occurrences = (await invoke(PLANNING_FUNCTIONS.getOccurrences, {
      planningId,
    })) as PlanningOccurrence[];

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
    const newPlanning = (await invoke(PLANNING_FUNCTIONS.create, {
      request,
    })) as Planning;

    logger.info("Planning created", newPlanning);

    set((state) => ({
      plannings: [newPlanning, ...state.plannings],
    }));

    return newPlanning;
  },

  update: async (id: number, request: UpdatePlanningRequest) => {
    const updatedPlanning = (await invoke(PLANNING_FUNCTIONS.update, {
      id,
      request,
    })) as Planning;

    logger.info("Planning updated", updatedPlanning);

    set((state) => ({
      plannings: state.plannings.map((p) => (p.id === id ? updatedPlanning : p)),
    }));

    return updatedPlanning;
  },

  remove: async (id: number) => {
    await invoke(PLANNING_FUNCTIONS.delete, { id });

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
    const updatedPlanning = (await invoke(PLANNING_FUNCTIONS.activate, { id })) as Planning;

    logger.info("Planning activated", updatedPlanning);

    set((state) => ({
      plannings: state.plannings.map((p) => (p.id === id ? updatedPlanning : p)),
    }));

    return updatedPlanning;
  },

  deactivate: async (id: number) => {
    const updatedPlanning = (await invoke(PLANNING_FUNCTIONS.deactivate, { id })) as Planning;

    logger.info("Planning deactivated", updatedPlanning);

    set((state) => ({
      plannings: state.plannings.map((p) => (p.id === id ? updatedPlanning : p)),
    }));

    return updatedPlanning;
  },

  cancelOccurrence: async (occurrenceId: number, planningId: number) => {
    const updatedOccurrence = (await invoke(PLANNING_FUNCTIONS.cancelOccurrence, {
      occurrenceId,
    })) as PlanningOccurrence;

    logger.info("Planning occurrence canceled", updatedOccurrence);

    const updatedPlanning = (await invoke(PLANNING_FUNCTIONS.get, {
      planningId,
    })) as Planning;

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
    const updatedOccurrence = (await invoke(PLANNING_FUNCTIONS.completeOccurrence, {
      occurrenceId,
      movementId,
    })) as PlanningOccurrence;

    logger.info("Planning occurrence completed", updatedOccurrence);

    const updatedPlanning = (await invoke(PLANNING_FUNCTIONS.get, {
      planningId,
    })) as Planning;

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
      const updatedPlanning = (await invoke(PLANNING_FUNCTIONS.get, {
        planningId: id,
      })) as Planning;

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
}));
