import { closeTauriDriver, createDriver, deleteDatabase, invokeCommand } from "@test/driver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type StatisticsObligationResponse = {
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

    const result = await invokeCommand<StatisticsObligationResponse>("get_statistics", {
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
});
