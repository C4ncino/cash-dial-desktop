import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";
import { statisticsStore } from "@/stores/statisticsStore";

const mockInvoke = vi.mocked(invoke);
const response = {
  currencyId: 1,
  overview: { income: 100, expenses: 40, netCashFlow: 60, savingsRate: 60 },
} as StatisticsResponse;

describe("statisticsStore", () => {
  beforeEach(() => {
    statisticsStore.setState({
      selectedCurrencyId: null,
      period: "month",
      periodStartMs: new Date(2026, 7, 1).getTime(),
      periodEndMs: new Date(2026, 8, 1).getTime(),
      granularity: "day",
      response: null,
      cache: {},
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it("requires a selected currency", async () => {
    await expect(statisticsStore.getState().fetchStatistics()).resolves.toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(statisticsStore.getState().error).toContain("Select a currency");
  });

  it("fetches and caches a response for the selected currency", async () => {
    statisticsStore.setState({ selectedCurrencyId: 1 });
    mockInvoke.mockResolvedValueOnce(response);

    await statisticsStore.getState().fetchStatistics();
    await statisticsStore.getState().fetchStatistics();

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(statisticsStore.getState().response).toEqual(response);
    expect(statisticsStore.getState().loading).toBe(false);
  });

  it("updates the error state when the command fails", async () => {
    statisticsStore.setState({ selectedCurrencyId: 1 });
    mockInvoke.mockRejectedValueOnce(new Error("backend unavailable"));

    await statisticsStore.getState().fetchStatistics();

    expect(statisticsStore.getState().error).toBe("backend unavailable");
    expect(statisticsStore.getState().loading).toBe(false);
  });

  it("sets loading immediately while the statistics command is pending", async () => {
    statisticsStore.setState({ selectedCurrencyId: 1 });
    let resolveRequest: (value: StatisticsResponse) => void = () => undefined;
    mockInvoke.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const request = statisticsStore.getState().fetchStatistics();
    expect(statisticsStore.getState().loading).toBe(true);

    resolveRequest(response);
    await request;
    expect(statisticsStore.getState().loading).toBe(false);
  });
});
