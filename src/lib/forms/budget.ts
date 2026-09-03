import { type FormDataRecord, validationResult } from "@/lib/forms/general";
import { BUDGET_TYPES } from "@/types/enums";

export function validateBudgetForm(data: FormDataRecord, isEditing: boolean) {
  const errors: string[] = [];
  if (!data.name || String(data.name).trim() === "") errors.push("El nombre es requerido");
  if (!isEditing && (!data.categoryId || String(data.categoryId).trim() === ""))
    errors.push("La categoría es requerida");
  if (!data.amountLimit || Number(data.amountLimit) <= 0)
    errors.push("El límite debe ser mayor que 0");
  return validationResult(errors);
}

export function getBudgetPeriodStart(type: BUDGET_TYPES): number {
  const date = new Date(Date.now());
  if (type === BUDGET_TYPES.WEEKLY) date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  if (type === BUDGET_TYPES.MONTHLY) date.setDate(1);
  if (type === BUDGET_TYPES.YEARLY) date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function createBudgetFromData(data: FormDataRecord, periodType: number) {
  return {
    budgetPeriodTypeId: periodType,
    categoryId: Number(data.categoryId),
    currencyId: Number(data.currency),
    name: String(data.name).trim(),
    amountLimit: Number(data.amountLimit),
    startDate: getBudgetPeriodStart(periodType),
  };
}
