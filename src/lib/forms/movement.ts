import { type FormDataRecord, validationResult } from "@/lib/forms/general";
import { MOVEMENT_TYPES } from "@/types/enums";

export type MovementFormData = FormDataRecord;

export function validateMovement(data: MovementFormData, typeId: number) {
  const errors: string[] = [];
  if (
    typeof data.amount !== "string" ||
    Number.isNaN(Number(data.amount)) ||
    Number(data.amount) <= 0
  )
    errors.push("El monto debe ser un número mayor a 0");
  if (typeof data.accountId !== "string" || data.accountId.trim() === "")
    errors.push("La cuenta es requerida");
  if (
    typeof data.currency !== "string" ||
    data.currency.trim() === "" ||
    Number(data.currency) <= 0
  )
    errors.push("La moneda es requerida");
  if (typeof data.categoryId !== "string" || data.categoryId.trim() === "")
    errors.push("La categoría es requerida");
  if (typeof data.date !== "string" || data.date.trim() === "")
    errors.push("La fecha es requerida");
  if (typeId === MOVEMENT_TYPES.TRANSFER) {
    if (typeof data.toAccountId !== "string" || data.toAccountId.trim() === "")
      errors.push("La cuenta destino es requerida");
    if (data.accountId === data.toAccountId)
      errors.push("La cuenta origen y destino no pueden ser la misma");
  }
  if (typeId === MOVEMENT_TYPES.EXPENSE && data.installments) {
    const installments = Number(data.installments);
    if (!Number.isNaN(installments) && (installments < 1 || installments > 48))
      errors.push("Las mensualidades deben ser entre 1 y 48");
  }
  return validationResult(errors);
}

export function createMovementFromData(
  data: MovementFormData,
  typeId: number,
  isCredit: boolean,
): Movement {
  const timestamp = new Date(
    `${String(data.date)}T${data.time ? String(data.time) : "00:00"}`,
  ).getTime();
  const installments = Number(data.installments);
  return {
    id: 0,
    typeId,
    accountId: Number(data.accountId),
    toAccountId: typeId === MOVEMENT_TYPES.TRANSFER ? Number(data.toAccountId) : undefined,
    categoryId: Number(data.categoryId),
    currencyId: Number(data.currency),
    originalAmount: Number(data.amount),
    accountAmount: Number(data.accountAmount ?? data.amount),
    installments:
      typeId === MOVEMENT_TYPES.EXPENSE && (isCredit || installments > 0)
        ? installments > 0
          ? installments
          : 1
        : undefined,
    timestamp,
    description: data.description ? String(data.description) : undefined,
    planningId:
      typeId === MOVEMENT_TYPES.TRANSFER
        ? undefined
        : data.planningId
          ? Number(data.planningId)
          : undefined,
  };
}
