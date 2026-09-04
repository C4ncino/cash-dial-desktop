import { MODAL_ID, MOVEMENT_TYPES } from "@/types/enums";

export const MOVEMENT_CREATE_REQUEST = "movement:create-requested";

export interface MovementCreateRequestDetail {
  typeId: number;
  accountId?: number;
}

export const movementCreateModalId = (typeId: number) => {
  if (typeId === MOVEMENT_TYPES.INCOME) return MODAL_ID.MOVEMENT.INCOME.CREATE;
  if (typeId === MOVEMENT_TYPES.EXPENSE) return MODAL_ID.MOVEMENT.EXPENSE.CREATE;
  if (typeId === MOVEMENT_TYPES.TRANSFER) return MODAL_ID.MOVEMENT.TRANSFER.CREATE;
  return null;
};

export const requestMovementCreation = (detail: MovementCreateRequestDetail) => {
  window.dispatchEvent(
    new CustomEvent<MovementCreateRequestDetail>(MOVEMENT_CREATE_REQUEST, { detail }),
  );
};
