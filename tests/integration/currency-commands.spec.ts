import {
  closeTauriDriver,
  createDriver,
  deleteDatabase,
  invokeCommand,
} from "@test/driver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CURRENCY_FUNCTIONS } from "@/types/enums";

function expectCurrency(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      symbol: expect.any(String),
      code: expect.any(String),
      conversionRate: expect.any(Number),
      conversionRateDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
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

    expect(currencies.map((currency) => currency.code)).toEqual(
      expect.arrayContaining([
        "MXN",
        "USD",
        "EUR",
        "JPY",
        "GBP",
        "AUD",
        "BRL",
        "CAD",
        "CNY",
        "NZD",
      ]),
    );
    expect(currencies.every((currency) => currency.conversionRate > 0)).toBe(
      true,
    );
  });

  it("refresh_currency_rates returns the persisted currency rate shape", async () => {
    const currencies = await invokeCommand<Currency[]>(
      CURRENCY_FUNCTIONS.refreshRates,
    );

    expectCurrencies(currencies);
    expect(currencies.length).toBeGreaterThanOrEqual(10);
  });
});
