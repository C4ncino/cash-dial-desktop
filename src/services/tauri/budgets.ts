import { BUDGET_FUNCTIONS, type BUDGET_UPDATE_TYPES } from "@/types/enums";
import { invokeCommand } from "./invoke";

export type CreateBudgetPayload = {
  budgetPeriodTypeId: number;
  categoryId: number;
  currencyId: number;
  name: string;
  amountLimit: number;
  startDate: number;
};

export const budgetsCommands = {
  getAll: () => invokeCommand<BudgetDetails[]>(BUDGET_FUNCTIONS.getAll),
  get: (id: number) => invokeCommand<BudgetDetails>(BUDGET_FUNCTIONS.get, { id }),
  getPeriodTypes: () => invokeCommand<BudgetPeriodType[]>(BUDGET_FUNCTIONS.getPeriodTypes),
  create: (payload: CreateBudgetPayload) =>
    invokeCommand<BudgetDetails>(BUDGET_FUNCTIONS.create, payload),
  remove: (id: number) => invokeCommand<void>(BUDGET_FUNCTIONS.delete, { id }),
  updateAmount: (id: number, amountLimit: number, updateType: BUDGET_UPDATE_TYPES) =>
    invokeCommand<BudgetDetails>(BUDGET_FUNCTIONS.updateAmount, { id, amountLimit, updateType }),
  updateName: (id: number, name: string) =>
    invokeCommand<string>(BUDGET_FUNCTIONS.updateName, { id, name }),
  getAffectedIds: (categoryId: number, previousCategoryId?: number) =>
    invokeCommand<number[]>(BUDGET_FUNCTIONS.getAffectedBudgetIds, {
      categoryId,
      previousCategoryId: previousCategoryId ?? null,
    }),
};
