import { validationResult } from "@/lib/forms/general";
import { MOVEMENT_TYPES, PLANNINGS_RECURRING_TYPES } from "@/types/enums";

export function validatePlanningForm(
  name: string,
  amount: number,
  accountId: number | undefined,
  categoryId: number | undefined,
  recurringTypeId: number,
  intervalStep: number,
  startDate: number,
  endDate: number | null | undefined,
  weekDays: number[],
  monthDays: number[],
  yearDays: PlanningYearDay[],
  typeId: number,
  isCreditAccount: boolean,
) {
  const errors: string[] = [];
  if (!name || name.trim() === "") errors.push("El nombre de la planificación es requerido");
  if (Number.isNaN(amount) || amount <= 0) errors.push("El monto debe ser un número mayor a 0");
  if (!accountId || accountId <= 0) errors.push("La cuenta es requerida");
  if (!categoryId || categoryId <= 0) errors.push("La categoría es requerida");
  if (typeId !== MOVEMENT_TYPES.INCOME && typeId !== MOVEMENT_TYPES.EXPENSE)
    errors.push("El tipo debe ser Ingreso o Gasto");
  if (isCreditAccount && typeId === MOVEMENT_TYPES.INCOME)
    errors.push("Las cuentas de tarjeta de crédito solo permiten gastos");
  if (intervalStep <= 0) errors.push("La frecuencia debe ser mayor a 0");
  if (!startDate) errors.push("La fecha de inicio es requerida");
  if (endDate && endDate < startDate)
    errors.push("La fecha de finalización no puede ser anterior a la fecha de inicio");
  if (recurringTypeId === PLANNINGS_RECURRING_TYPES.WEEKLY && weekDays.length === 0)
    errors.push("Debes seleccionar al menos un día de la semana para la regla semanal");
  if (recurringTypeId === PLANNINGS_RECURRING_TYPES.MONTHLY && monthDays.length === 0)
    errors.push("Debes seleccionar al menos un día del mes para la regla mensual");
  if (recurringTypeId === PLANNINGS_RECURRING_TYPES.YEARLY && yearDays.length === 0)
    errors.push("Debes agregar al menos una fecha para la regla anual");
  return validationResult(errors);
}

export function createPlanningRequest(data: CreatePlanningRequest): CreatePlanningRequest {
  return {
    ...data,
    name: data.name.trim(),
    endDate: data.endDate ?? null,
    weekDays:
      data.recurringTypeId === PLANNINGS_RECURRING_TYPES.WEEKLY ? (data.weekDays ?? []) : null,
    monthDays:
      data.recurringTypeId === PLANNINGS_RECURRING_TYPES.MONTHLY ? (data.monthDays ?? []) : null,
    yearDays:
      data.recurringTypeId === PLANNINGS_RECURRING_TYPES.YEARLY ? (data.yearDays ?? []) : null,
  };
}
