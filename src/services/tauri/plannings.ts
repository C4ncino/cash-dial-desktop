import { PLANNING_FUNCTIONS } from "@/types/enums";
import { invokeCommand } from "./invoke";

export const planningsCommands = {
  getRecurringTypes: () =>
    invokeCommand<PlanningRecurringType[]>(PLANNING_FUNCTIONS.getRecurringTypes),
  getStatuses: () => invokeCommand<PlanningStatus[]>(PLANNING_FUNCTIONS.getStatuses),
  getAll: () => invokeCommand<Planning[]>(PLANNING_FUNCTIONS.getAll),
  get: (planningId: number) =>
    invokeCommand<Planning>(PLANNING_FUNCTIONS.get, { planningId }),
  getOccurrences: (planningId: number) =>
    invokeCommand<PlanningOccurrence[]>(PLANNING_FUNCTIONS.getOccurrences, { planningId }),
  create: (request: CreatePlanningRequest) =>
    invokeCommand<Planning>(PLANNING_FUNCTIONS.create, { request }),
  update: (id: number, request: UpdatePlanningRequest) =>
    invokeCommand<Planning>(PLANNING_FUNCTIONS.update, { id, request }),
  remove: (id: number) => invokeCommand<void>(PLANNING_FUNCTIONS.delete, { id }),
  activate: (id: number) => invokeCommand<Planning>(PLANNING_FUNCTIONS.activate, { id }),
  deactivate: (id: number) => invokeCommand<Planning>(PLANNING_FUNCTIONS.deactivate, { id }),
  cancelOccurrence: (occurrenceId: number) =>
    invokeCommand<PlanningOccurrence>(PLANNING_FUNCTIONS.cancelOccurrence, { occurrenceId }),
  completeOccurrence: (occurrenceId: number, movementId: number) =>
    invokeCommand<PlanningOccurrence>(PLANNING_FUNCTIONS.completeOccurrence, {
      occurrenceId,
      movementId,
    }),
};
