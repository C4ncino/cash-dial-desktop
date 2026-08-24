import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.unmock("@/stores/currencyStore");

import { invoke } from "@tauri-apps/api/core";

import { currencyStore } from "@/stores/currencyStore";

const mockInvoke = vi.mocked(invoke);

const currency = {
  id: 1,
  name: "Peso",
  symbol: "$",
  code: "MXN",
  conversionRate: 1,
};

const refreshedCurrency = {
  ...currency,
  conversionRate: 19.8,
  conversionRateDate: "2026-08-19",
};

describe("currencyStore", () => {
  beforeEach(() => {
    logger.debug("Resetting currencyStore state for test");
    currencyStore.setState({
      currencies: [],
    });

    vi.clearAllMocks();
  });

  it("populate loads currencies", async () => {
    mockInvoke.mockResolvedValue([currency]);

    await currencyStore.getState().populate();

    expect(currencyStore.getState().currencies).toEqual([currency]);
  });

  it("getById returns currency", () => {
    currencyStore.setState({
      currencies: [currency],
    });

    expect(currencyStore.getState().getById(1)).toEqual(currency);
  });

  it("returns undefined for missing currency", () => {
    expect(currencyStore.getState().getById(999)).toBeUndefined();
  });

  it("replaces currencies with the rates returned by a refresh", async () => {
    currencyStore.setState({ currencies: [currency] });
    mockInvoke.mockResolvedValue([refreshedCurrency]);

    await currencyStore.getState().refreshRates();

    expect(mockInvoke).toHaveBeenCalledWith("refresh_currency_rates");
    expect(currencyStore.getState().currencies).toEqual([refreshedCurrency]);
  });

  it("preserves cached rates when a refresh fails", async () => {
    currencyStore.setState({ currencies: [currency] });
    mockInvoke.mockRejectedValue(new Error("ECB unavailable"));

    await expect(currencyStore.getState().refreshRates()).rejects.toThrow("ECB unavailable");

    expect(currencyStore.getState().currencies).toEqual([currency]);
  });
});
