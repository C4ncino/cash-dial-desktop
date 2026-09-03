import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initStores, resetInitializationForTests } from "@/lib/init";
import { logger } from "@/lib/logger";

const mocks = vi.hoisted(() => ({
  populate: Array.from({ length: 6 }, () => vi.fn().mockResolvedValue(undefined)),
  refreshRates: vi.fn().mockResolvedValue(undefined),
  currencies: [] as Array<{ conversionRateDate?: string | null }>,
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  setupGlobalErrorHandlers: vi.fn(),
}));

vi.mock("@/stores/currencyStore", () => ({
  currencyStore: {
    getState: () => ({
      populate: mocks.populate[0],
      currencies: mocks.currencies,
      refreshRates: mocks.refreshRates,
    }),
  },
}));
vi.mock("@/stores/accountsStore", () => ({
  accountsStore: { getState: () => ({ populate: mocks.populate[1] }) },
}));
vi.mock("@/stores/categoryStore", () => ({
  categoryStore: { getState: () => ({ populate: mocks.populate[2] }) },
}));
vi.mock("@/stores/movementsStore", () => ({
  movementsStore: { getState: () => ({ populate: mocks.populate[3] }) },
}));
vi.mock("@/stores/budgetStore", () => ({
  budgetStore: { getState: () => ({ populate: mocks.populate[4] }) },
}));
vi.mock("@/stores/planningsStore", () => ({
  planningsStore: { getState: () => ({ populate: mocks.populate[5] }) },
}));

describe("initStores", () => {
  beforeEach(() => {
    resetInitializationForTests();
    vi.clearAllMocks();
    mocks.populate.forEach((populate) => {
      populate.mockResolvedValue(undefined);
    });
    mocks.refreshRates.mockResolvedValue(undefined);
    mocks.currencies.splice(0);
    vi.mocked(invoke).mockResolvedValue(false);
  });

  it("initializes the backend and populates every store", async () => {
    await initStores();
    expect(vi.mocked(invoke).mock.calls.map(([command]) => command)).toEqual([
      "get_initialize_state",
      "initialize",
    ]);
    mocks.populate.forEach((populate) => {
      expect(populate).toHaveBeenCalledTimes(1);
    });
    expect(logger.info).toHaveBeenCalledWith("Stores ready...");
  });

  it("refreshes stale rates but skips rates already dated today", async () => {
    mocks.currencies.push({ conversionRateDate: "2000-01-01" });
    await initStores();
    expect(mocks.refreshRates).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    mocks.currencies[0].conversionRateDate = new Date().toISOString().slice(0, 10);
    await initStores();
    expect(mocks.refreshRates).not.toHaveBeenCalled();
  });

  it("logs rate refresh failure and continues with cached rates", async () => {
    mocks.currencies.push({ conversionRateDate: null });
    mocks.refreshRates.mockRejectedValueOnce(new Error("offline"));
    await expect(initStores()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      "Currency rate refresh failed; using cached rates",
      expect.any(Error),
    );
  });

  it("propagates initialization and population failures", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("database unavailable"));
    await expect(initStores()).rejects.toThrow("database unavailable");

    vi.mocked(invoke).mockResolvedValue(false);
    mocks.populate[2].mockRejectedValueOnce(new Error("categories unavailable"));
    await expect(initStores()).rejects.toThrow("categories unavailable");
  });
});
