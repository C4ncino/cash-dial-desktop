import { closeTauriDriver, createDriver, deleteDatabase, invokeCommand } from "@test/driver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type StatisticsCommandResponse = {
  overview: { income: number; expenses: number; netCashFlow: number; savingsRate: number | null };
  timeseries: Array<{ bucketStartMs: number; income: number; expense: number; net: number }>;
  balanceTrend: Array<{ bucketStartMs: number; balance: number }>;
  categories: {
    totalExpenses: number;
    byCategoryHierarchy: Array<{ categoryId: number; amount: number }>;
    byCategoryFlat: Array<{ categoryId: number; amount: number }>;
  };
  incomeCategories: {
    totalIncome: number;
    byCategoryHierarchy: Array<{ categoryId: number; amount: number }>;
    byCategoryFlat: Array<{ categoryId: number; amount: number }>;
  };
  obligations: {
    totals: {
      next7Days: number;
      next30Days: number;
      next90Days: number;
    };
    items: Array<{
      installmentId: number;
      movementId: number;
      accountId: number;
      dueTimestamp: number;
      amount: number;
      paid: boolean;
      description: string | null;
      categoryId: number;
    }>;
  };
};

describe("Statistics commands", () => {
  beforeAll(async () => {
    await createDriver();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  it("returns account and description data for obligations", async () => {
    const currencies = await invokeCommand<Currency[]>("get_currencies");
    const currencyId = currencies[0]?.id;
    expect(currencyId).toEqual(expect.any(Number));

    const result = await invokeCommand<StatisticsCommandResponse>("get_statistics", {
      startMs: Date.now() - 24 * 60 * 60 * 1000,
      endMs: Date.now() + 24 * 60 * 60 * 1000,
      currencyId,
      granularity: "day",
      options: { includeObligations: true },
    });
    const movements = await invokeCommand<Movement[]>("get_movements");

    expect(result.obligations.totals).toEqual({
      next7Days: expect.any(Number),
      next30Days: expect.any(Number),
      next90Days: expect.any(Number),
    });
    expect(Array.isArray(result.obligations.items)).toBe(true);

    for (const obligation of result.obligations.items) {
      expect(obligation).toEqual(
        expect.objectContaining({
          installmentId: expect.any(Number),
          movementId: expect.any(Number),
          accountId: expect.any(Number),
          dueTimestamp: expect.any(Number),
          amount: expect.any(Number),
          paid: expect.any(Boolean),
          categoryId: expect.any(Number),
        }),
      );
      expect(obligation.description === null || typeof obligation.description === "string").toBe(
        true,
      );
      const movement = movements.find((item) => item.id === obligation.movementId);
      expect(movement).toBeDefined();
      expect(obligation.accountId).toBe(movement?.accountId);
    }
  });

  it("honors option flags and every supported granularity", async () => {
    const currencies = await invokeCommand<Currency[]>("get_currencies");
    const currency = currencies[0];
    if (!currency) throw new Error("No seeded currency was found");
    const currencyId = currency.id;
    const startMs = new Date(2025, 0, 1).getTime();
    const endMs = new Date(2027, 0, 1).getTime();

    for (const granularity of ["day", "week", "month", "year"]) {
      const result = await invokeCommand<StatisticsCommandResponse>("get_statistics", {
        startMs,
        endMs,
        currencyId,
        granularity,
        options: {
          categoryId: 1,
          includeDescendants: false,
          includeObligations: false,
        },
      });
      const movements = await invokeCommand<Movement[]>("get_movements");
      const selectedMovements = movements.filter(
        (movement) =>
          movement.currencyId === currencyId &&
          movement.categoryId === 1 &&
          movement.timestamp >= startMs &&
          movement.timestamp < endMs,
      );
      const expectedIncome = selectedMovements
        .filter((movement) => movement.typeId === 1)
        .reduce((total, movement) => total + movement.originalAmount, 0);
      const expectedExpenses = selectedMovements
        .filter((movement) => movement.typeId === 2)
        .reduce((total, movement) => total + movement.originalAmount, 0);

      expect(result.overview.netCashFlow).toBe(result.overview.income - result.overview.expenses);
      expect(result.categories.totalExpenses).toBeCloseTo(expectedExpenses);
      expect(result.incomeCategories.totalIncome).toBeCloseTo(expectedIncome);
      expect(Array.isArray(result.categories.byCategoryHierarchy)).toBe(true);
      expect(Array.isArray(result.categories.byCategoryFlat)).toBe(true);
      expect(Array.isArray(result.incomeCategories.byCategoryHierarchy)).toBe(true);
      expect(Array.isArray(result.incomeCategories.byCategoryFlat)).toBe(true);
      expect(result.timeseries.every((point) => Number.isFinite(point.bucketStartMs))).toBe(true);
      expect(result.timeseries.map((point) => point.bucketStartMs)).toEqual(
        [...result.timeseries.map((point) => point.bucketStartMs)].sort((a, b) => a - b),
      );
      expect(result.balanceTrend.at(-1)?.balance).toBe(1700);
      expect(result.obligations).toEqual({
        totals: { next7Days: 0, next30Days: 0, next90Days: 0 },
        items: [],
      });
    }
  });
});
