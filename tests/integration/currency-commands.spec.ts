import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { createDriver, closeTauriDriver, deleteDatabase, seedDatabase, invokeCommand } from "@test/driver";
import { CURRENCY_FUNCTIONS } from "@/types/enums";

export function expectCurrency(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      symbol: expect.any(String),
      code: expect.any(String),
    }),
  );
}

export function expectCurrencies(value: unknown) {
  expect(Array.isArray(value)).toBe(true);

  (value as unknown[]).forEach(expectCurrency);
}


describe("Currency Commands", () => {
  beforeAll(async () => {
    await createDriver();
    seedDatabase();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  it("get_currencies returns Currency[]", async () => {
    const result = await invokeCommand<unknown>(
      CURRENCY_FUNCTIONS.get,
    );

    expectCurrencies(result);
  });

  it("currencies contain values", async () => {
    const currencies = await invokeCommand<Currency[]>(
      CURRENCY_FUNCTIONS.get,
    );

    expect(currencies.length).toBeGreaterThan(0);
  });
});