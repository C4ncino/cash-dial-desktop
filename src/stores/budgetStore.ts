import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { budgetsCommands } from "@/services/tauri/budgets";
import { type BUDGET_UPDATE_TYPES } from "@/types/enums";

export const budgetStore = createStore<BudgetStore & BudgetActions>((set, get) => ({
  budgets: [] as BudgetDetails[],
  periodTypes: [] as BudgetPeriodType[],

  populate: async () => {
    const periodTypes = await budgetsCommands.getPeriodTypes();
    const budgets = await budgetsCommands.getAll();

    logger.debug("Budgets:", budgets);
    logger.debug("Budget period types:", periodTypes);

    return set({
      budgets,
      periodTypes,
    });
  },

  getById: (id: number) => get().budgets.find((b) => b.budget.id === id),

  add: async (budget: {
    budgetPeriodTypeId: number;
    categoryId: number;
    currencyId: number;
    name: string;
    amountLimit: number;
    startDate: number;
  }) => {
    const newBudget = await budgetsCommands.create({
      budgetPeriodTypeId: budget.budgetPeriodTypeId,
      categoryId: budget.categoryId,
      currencyId: budget.currencyId,
      name: budget.name,
      amountLimit: budget.amountLimit,
      startDate: budget.startDate,
    });

    logger.info("Budget created", newBudget);

    return set((state) => ({
      budgets: [...state.budgets, newBudget],
    }));
  },

  remove: async (id: number) => {
    await budgetsCommands.remove(id);

    logger.info("Budget deleted", { id });

    return set((state) => ({
      budgets: state.budgets.filter((b) => b.budget.id !== id),
    }));
  },

  updateAmount: async (id: number, amountLimit: number, updateType: BUDGET_UPDATE_TYPES) => {
    const updatedBudget = await budgetsCommands.updateAmount(id, amountLimit, updateType);

    logger.info("Budget amount updated", updatedBudget);

    return set((state) => ({
      budgets: state.budgets.map((b) => (b.budget.id === id ? updatedBudget : b)),
    }));
  },

  updateName: async (id: number, name: string) => {
    const updatedName = await budgetsCommands.updateName(id, name);

    logger.info("Budget name updated", { id, name: updatedName });

    return set((state) => ({
      budgets: state.budgets.map((b) =>
        b.budget.id === id ? { ...b, budget: { ...b.budget, name: updatedName } } : b,
      ),
    }));
  },

  refresh: async (id: number) => {
    const updatedBudget = await budgetsCommands.get(id);

    logger.debug("Budget refreshed", updatedBudget);

    return set((state) => ({
      budgets: state.budgets.map((b) => (b.budget.id === id ? updatedBudget : b)),
    }));
  },

  refreshAffected: async (categoryId: number, previousCategoryId?: number) => {
    const affectedIds = await budgetsCommands.getAffectedIds(categoryId, previousCategoryId);

    if (affectedIds.length === 0) return;

    logger.debug("Refreshing affected budgets", { categoryId, previousCategoryId, affectedIds });

    const refreshedBudgets = await Promise.all(
      affectedIds.map((id) => budgetsCommands.get(id)),
    );

    const refreshedMap = new Map(refreshedBudgets.map((b) => [b.budget.id, b]));

    return set((state) => ({
      budgets: state.budgets.map((b) => refreshedMap.get(b.budget.id) ?? b),
    }));
  },
}));
