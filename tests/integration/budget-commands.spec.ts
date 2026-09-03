import { closeTauriDriver, createDriver, deleteDatabase, invokeCommand } from "@test/driver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BUDGET_FUNCTIONS } from "@/types/enums";

type BudgetRow = {
  id: number;
  budgetPeriodTypeId: number;
  categoryId: number;
  currencyId: number;
  name: string;
};

type BudgetPeriodDetails = {
  startDate: number;
  endDate: number;
  amountLimit: number;
  amountSpend: number;
  movementIds: number[];
};

type BudgetDetails = {
  budget: BudgetRow;
  periods: BudgetPeriodDetails[];
};

type BudgetPeriodType = {
  id: number;
  key: string;
  name: string;
};

function expectBudgetPeriodType(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      key: expect.any(String),
      name: expect.any(String),
    }),
  );
}

function expectBudgetPeriodTypes(value: unknown) {
  expect(Array.isArray(value)).toBe(true);

  (value as unknown[]).forEach(expectBudgetPeriodType);
}

function expectBudgetRow(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      budgetPeriodTypeId: expect.any(Number),
      categoryId: expect.any(Number),
      currencyId: expect.any(Number),
      name: expect.any(String),
    }),
  );
}

function expectIdAsInteger(id: unknown) {
  expect(id).toEqual(expect.any(Number));
}

function expectBudgetPeriodDetails(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      startDate: expect.any(Number),
      endDate: expect.any(Number),
      amountLimit: expect.any(Number),
      amountSpend: expect.any(Number),
      movementIds: expect.any(Array),
    }),
  );

  const period = value as BudgetPeriodDetails;
  expect(Array.isArray(period.movementIds)).toBe(true);
  period.movementIds.forEach((movementId) => void expectIdAsInteger(movementId));
}

function expectBudgetDetails(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      budget: expect.any(Object),
      periods: expect.any(Array),
    }),
  );

  const details = value as BudgetDetails;
  expectBudgetRow(details.budget);
  expect(Array.isArray(details.periods)).toBe(true);
  details.periods.forEach(expectBudgetPeriodDetails);
}

function expectBudgets(value: unknown) {
  expect(Array.isArray(value)).toBe(true);
  (value as unknown[]).forEach(expectBudgetDetails);
}

async function createTestBudget(name: string) {
  const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.create, {
    budgetPeriodTypeId: 1,
    categoryId: 1,
    currencyId: 1,
    name,
    amountLimit: 150.0,
    startDate: Date.now(),
  });

  expectBudgetDetails(result);
  return result as BudgetDetails;
}

describe("Tauri - Budget commands", () => {
  beforeAll(async () => {
    await createDriver();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  it("get_budget_period_types returns BudgetPeriodType[]", async () => {
    const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.getPeriodTypes);
    expectBudgetPeriodTypes(result);
    const types = result as BudgetPeriodType[];
    expect(types.length).toBeGreaterThan(0);
  });

  it("get_all_budgets returns BudgetDetails[]", async () => {
    const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.getAll);
    expectBudgets(result);
    const budgets = result as BudgetDetails[];
    expect(budgets.length).toBeGreaterThanOrEqual(0);
  });

  it("create_budget returns BudgetDetails", async () => {
    const created = await createTestBudget("Create Budget Test");
    expect(created.budget.name).toBe("Create Budget Test");
  });

  it("get_budget returns BudgetDetails for an existing budget", async () => {
    const created = await createTestBudget("Get Budget Test");
    const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.get, { id: created.budget.id });

    expectBudgetDetails(result);
    expect((result as BudgetDetails).budget.id).toBe(created.budget.id);
  });

  it("update_budget_name returns the updated name", async () => {
    const created = await createTestBudget("Rename Budget Test");
    const updatedName = "Renamed Budget Test";

    const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.updateName, {
      id: created.budget.id,
      name: updatedName,
    });

    expect(result).toEqual(expect.any(String));
    expect(result).toBe(updatedName);

    const refreshed = await invokeCommand<unknown>(BUDGET_FUNCTIONS.get, { id: created.budget.id });
    expectBudgetDetails(refreshed);
    expect((refreshed as BudgetDetails).budget.name).toBe(updatedName);
  });

  it("update_budget_amount returns BudgetDetails with updated amount", async () => {
    const created = await createTestBudget("Amount Budget Test");
    const newLimit = 200.0;

    const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.updateAmount, {
      id: created.budget.id,
      amountLimit: newLimit,
      updateType: "today",
    });

    expectBudgetDetails(result);
    const updated = result as BudgetDetails;
    expect(updated.budget.id).toBe(created.budget.id);
    expect(updated.periods[updated.periods.length - 1].amountLimit).toBe(newLimit);
  });

  it("delete_budget returns a deleted rows count", async () => {
    const created = await createTestBudget("Delete Budget Test");
    const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.delete, { id: created.budget.id });

    expect(result).toEqual(expect.any(Number));
    expect((result as number) >= 0).toBe(true);
  });

  it("get_affected_budget_ids returns budget ids for a category with a budget", async () => {
    const created = await createTestBudget("Affected Ids Test");
    const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.getAffectedBudgetIds, {
      categoryId: created.budget.categoryId,
    });

    expect(Array.isArray(result)).toBe(true);
    const ids = result as number[];
    ids.forEach((id) => void expectIdAsInteger(id));
    expect(ids).toContain(created.budget.id);
  });

  it("get_affected_budget_ids accepts an optional previousCategoryId", async () => {
    const created = await createTestBudget("Affected Ids Prev Test");
    const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.getAffectedBudgetIds, {
      categoryId: created.budget.categoryId,
      previousCategoryId: created.budget.categoryId,
    });

    expect(Array.isArray(result)).toBe(true);
    const ids = result as number[];
    ids.forEach((id) => void expectIdAsInteger(id));
    expect(ids).toContain(created.budget.id);
  });

  it("get_affected_budget_ids returns empty array for category with no budget", async () => {
    const result = await invokeCommand<unknown>(BUDGET_FUNCTIONS.getAffectedBudgetIds, {
      categoryId: 999999,
    });

    expect(Array.isArray(result)).toBe(true);
    expect((result as number[]).length).toBe(0);
  });
});
