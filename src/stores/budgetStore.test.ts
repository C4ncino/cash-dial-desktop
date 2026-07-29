import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";

import { budgetStore } from "@/stores/budgetStore";
import { BUDGET_UPDATE_TYPES } from "@/types/enums";

const mockInvoke = vi.mocked(invoke);

const samplePeriodType = { id: 1, key: "monthly", name: "Monthly" };
const sampleBudget: BudgetDetails = {
  budget: { id: 1, budgetPeriodTypeId: 1, categoryId: 1, currencyId: 1, name: "B1" },
  periods: [{ startDate: 0, endDate: 1, amountLimit: 200, amountSpend: 10, movementIds: [] }],
};

describe("budgetStore", () => {
  beforeEach(() => {
    budgetStore.setState({ budgets: [], periodTypes: [] });
    vi.clearAllMocks();
  });

  it("populate loads period types and budgets", async () => {
    mockInvoke.mockResolvedValueOnce([samplePeriodType]).mockResolvedValueOnce([sampleBudget]);

    await budgetStore.getState().populate();

    expect(budgetStore.getState().periodTypes).toEqual([samplePeriodType]);
    expect(budgetStore.getState().budgets).toEqual([sampleBudget]);
  });

  it("add appends a new budget", async () => {
    mockInvoke.mockResolvedValueOnce(sampleBudget);

    await budgetStore.getState().add({
      budgetPeriodTypeId: 1,
      categoryId: 1,
      currencyId: 1,
      name: "B1",
      amountLimit: 200,
      startDate: 0,
    });

    expect(budgetStore.getState().budgets).toHaveLength(1);
    expect(budgetStore.getState().budgets[0]).toEqual(sampleBudget);
  });

  it("remove deletes budget", async () => {
    budgetStore.setState({ budgets: [sampleBudget], periodTypes: [] });
    mockInvoke.mockResolvedValue(1);

    await budgetStore.getState().remove(1);

    expect(budgetStore.getState().budgets).toHaveLength(0);
  });

  it("updateName updates local state", async () => {
    budgetStore.setState({ budgets: [sampleBudget], periodTypes: [] });
    mockInvoke.mockResolvedValueOnce("New name");

    await budgetStore.getState().updateName(1, "New name");

    expect(budgetStore.getState().getById(1)?.budget.name).toBe("New name");
  });

  it("updateAmount replaces budget details", async () => {
    const updated: BudgetDetails = {
      budget: { id: 1, budgetPeriodTypeId: 1, categoryId: 1, currencyId: 1, name: "B1" },
      periods: [{ startDate: 0, endDate: 1, amountLimit: 300, amountSpend: 0, movementIds: [] }],
    };
    budgetStore.setState({ budgets: [sampleBudget], periodTypes: [] });
    mockInvoke.mockResolvedValueOnce(updated);

    await budgetStore.getState().updateAmount(1, 300, BUDGET_UPDATE_TYPES.CORRECT);

    expect(budgetStore.getState().getById(1)?.periods[0].amountLimit).toBe(300);
  });
});
