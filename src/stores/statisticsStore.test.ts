import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 13));
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

  afterEach(() => vi.useRealTimers());

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

  it("does not reuse a cached response for a different currency", async () => {
    statisticsStore.setState({ selectedCurrencyId: 1 });
    mockInvoke.mockResolvedValue(response);
    await statisticsStore.getState().fetchStatistics();

    statisticsStore.setState({ selectedCurrencyId: 2, response: null });
    await statisticsStore.getState().fetchStatistics();

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenLastCalledWith(
      "get_statistics",
      expect.objectContaining({ currencyId: 2 }),
    );
  });

  it("does not let an older request replace the latest selection", async () => {
    let resolveFirst: (value: StatisticsResponse) => void = () => undefined;
    let resolveSecond: (value: StatisticsResponse) => void = () => undefined;
    mockInvoke
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));

    statisticsStore.setState({ selectedCurrencyId: 1 });
    const first = statisticsStore.getState().fetchStatistics();
    statisticsStore.setState({ selectedCurrencyId: 2 });
    const second = statisticsStore.getState().fetchStatistics();
    const latest = { ...response, currencyId: 2 } as StatisticsResponse;

    resolveSecond(latest);
    await second;
    resolveFirst(response);
    await first;

    expect(statisticsStore.getState().selectedCurrencyId).toBe(2);
    expect(statisticsStore.getState().response).toEqual(latest);
    expect(statisticsStore.getState().loading).toBe(false);
  });

  it("keeps the newest request loading when an older request fails", async () => {
    let rejectFirst: (reason: Error) => void = () => undefined;
    let resolveSecond: (value: StatisticsResponse) => void = () => undefined;
    mockInvoke
      .mockReturnValueOnce(new Promise((_, reject) => (rejectFirst = reject)))
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));

    statisticsStore.setState({ selectedCurrencyId: 1 });
    const first = statisticsStore.getState().fetchStatistics();
    statisticsStore.setState({ selectedCurrencyId: 2 });
    const second = statisticsStore.getState().fetchStatistics();
    rejectFirst(new Error("stale failure"));
    await first;
    expect(statisticsStore.getState().loading).toBe(true);
    expect(statisticsStore.getState().error).toBeNull();

    resolveSecond({ ...response, currencyId: 2 } as StatisticsResponse);
    await second;
    expect(statisticsStore.getState().loading).toBe(false);
  });

  it("invalidates cached financial data and any in-flight response", async () => {
    let resolveRequest: (value: StatisticsResponse) => void = () => undefined;
    statisticsStore.setState({
      selectedCurrencyId: 1,
      response,
      cache: { stale: response },
    });
    mockInvoke.mockReturnValueOnce(new Promise((resolve) => (resolveRequest = resolve)));
    const request = statisticsStore.getState().fetchStatistics();

    statisticsStore.getState().invalidate();
    expect(statisticsStore.getState().cache).toEqual({});
    expect(statisticsStore.getState().response).toBeNull();
    resolveRequest(response);
    await request;
    expect(statisticsStore.getState().response).toBeNull();
  });

  it("selects a normalized historical period and fetches its half-open range", () => {
    statisticsStore.setState({ selectedCurrencyId: 1 });
    mockInvoke.mockResolvedValue(response);

    statisticsStore.getState().setPeriodStart(new Date(2025, 2, 19, 15).getTime());

    expect(statisticsStore.getState()).toMatchObject({
      periodStartMs: new Date(2025, 2, 1).getTime(),
      periodEndMs: new Date(2025, 3, 1).getTime(),
      response: null,
      error: null,
    });
    expect(mockInvoke).toHaveBeenCalledWith(
      "get_statistics",
      expect.objectContaining({
        startMs: new Date(2025, 2, 1).getTime(),
        endMs: new Date(2025, 3, 1).getTime(),
      }),
    );
  });

  it("clamps direct future selection to the current period", () => {
    statisticsStore.getState().setPeriodStart(new Date(2027, 0, 1).getTime());
    expect(statisticsStore.getState().periodStartMs).toBe(new Date(2026, 7, 1).getTime());
  });
});
