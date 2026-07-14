import { closeTauriDriver, createDriver, deleteDatabase, invokeCommand } from "@test/driver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CURRENCY_FUNCTIONS } from "@/types/enums";

function expectCurrency(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      symbol: expect.any(String),
      code: expect.any(String),
    }),
  );
}

function expectCurrencies(value: unknown) {
  expect(Array.isArray(value)).toBe(true);

  (value as unknown[]).forEach(expectCurrency);
}

describe("Currency Commands", () => {
  beforeAll(async () => {
    await createDriver();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  it("get_currencies returns Currency[]", async () => {
    const result = await invokeCommand<unknown>(CURRENCY_FUNCTIONS.get);

    expectCurrencies(result);
  });

  it("currencies contain values", async () => {
    const currencies = await invokeCommand<Currency[]>(CURRENCY_FUNCTIONS.get);

    expect(currencies.length).toBeGreaterThan(0);
  });
});
