import { validationResult, type FormDataRecord } from "@/lib/forms/general";
import { ACCOUNT_TYPES } from "@/types/enums";

export type AccountFormData = FormDataRecord;

export function validateAccountForm(data: AccountFormData) {
  const errors: string[] = [];
  if (typeof data.name !== "string" || data.name.trim() === "")
    errors.push("El nombre es requerido");
  if (typeof data.name === "string" && data.name.trim().length > 25)
    errors.push("El nombre debe tener máximo 25 caracteres");
  if (typeof data.balance !== "string" || !Number.isFinite(Number(data.balance)))
    errors.push("El saldo debe ser un número válido");
  if (typeof data.type !== "string" || data.type.trim() === "" || Number.isNaN(Number(data.type)))
    errors.push("El tipo de cuenta es requerido");

  if (Number(data.type) === ACCOUNT_TYPES.CREDIT) {
    if (
      typeof data.creditLimit !== "string" ||
      data.creditLimit.trim() === "" ||
      !Number.isFinite(Number(data.creditLimit))
    )
      errors.push("El límite de crédito es requerido");
    if (Number(data.creditLimit) <= 0) errors.push("El límite de crédito debe ser mayor a 0");
    if (Number(data.balance) < 0) errors.push("El saldo usado debe ser mayor o igual a 0");
    if (
      typeof data.cutoffDay !== "string" ||
      data.cutoffDay.trim() === "" ||
      !Number.isInteger(Number(data.cutoffDay))
    )
      errors.push("El día de corte es requerido");
    if (
      typeof data.daysToPay !== "string" ||
      data.daysToPay.trim() === "" ||
      !Number.isInteger(Number(data.daysToPay))
    )
      errors.push("El día de pago es requerido");
    if (Number(data.cutoffDay) <= 0 || Number(data.cutoffDay) > 31)
      errors.push("El día de corte debe ser un número entre 1 y 31");
    if (Number(data.daysToPay) <= 0 || Number(data.daysToPay) > 30)
      errors.push("El día de pago debe ser un número entre 1 y 30");
  }
  return validationResult(errors);
}

export function createAccountFromData(data: AccountFormData, type: AccountType): Account {
  return {
    id: 0,
    name: String(data.name),
    balance: Number(data.balance),
    type,
    currencyId: Number(data.currency),
    creditInfo:
      data.type === String(ACCOUNT_TYPES.CREDIT)
        ? {
            creditLimit: Number(data.creditLimit),
            cutoffDay: Number(data.cutoffDay),
            daysToPay: Number(data.daysToPay),
          }
        : undefined,
    isActive: true,
  };
}
