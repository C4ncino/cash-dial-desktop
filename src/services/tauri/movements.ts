import { MOVEMENT_FUNCTIONS } from "@/types/enums";
import { invokeCommand } from "./invoke";

export type MovementPayload = Omit<Movement, "id" | "installmentsData">;

const toCommandPayload = (movement: MovementPayload) => ({
  typeId: movement.typeId,
  accountId: movement.accountId,
  toAccountId: movement.toAccountId,
  categoryId: movement.categoryId,
  currencyId: movement.currencyId,
  originalAmount: movement.originalAmount,
  accountAmount: movement.accountAmount,
  installments: movement.installments,
  timestamp: movement.timestamp,
  description: movement.description,
});

export const movementsCommands = {
  getAll: () => invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get),
  getTypes: () => invokeCommand<MovementType[]>(MOVEMENT_FUNCTIONS.getTypes),
  get: (movementId: number) =>
    invokeCommand<Movement>(MOVEMENT_FUNCTIONS.getById, { movementId }),
  getInstallments: (movementId: number) =>
    invokeCommand<MovementInstallment[]>(MOVEMENT_FUNCTIONS.getInstallments, { movementId }),
  add: (movement: MovementPayload) =>
    invokeCommand<Movement>(MOVEMENT_FUNCTIONS.add, {
      ...toCommandPayload(movement),
      planningId: movement.planningId,
    }),
  update: (id: number, movement: MovementPayload) =>
    invokeCommand<Movement>(MOVEMENT_FUNCTIONS.update, { id, ...toCommandPayload(movement) }),
  remove: (id: number) => invokeCommand<void>(MOVEMENT_FUNCTIONS.remove, { id }),
};
