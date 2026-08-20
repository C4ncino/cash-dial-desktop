import { invoke } from "@tauri-apps/api/core";
import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import {
  DEFAULT_GRANULARITY,
  isCurrentPeriod,
  PERIOD_GRANULARITIES,
  periodRange,
  type StatisticsPeriod,
  shiftPeriod,
  startOfPeriod,
} from "@/lib/statisticsQuery";

const cacheKey = (
  startMs: number,
  endMs: number,
  currencyId: number,
  granularity: StatisticsGranularity,
  options?: StatisticsOptions,
) => JSON.stringify([startMs, endMs, currencyId, granularity, options ?? null]);

const initialCurrencyId = 1;
const initialPeriod: StatisticsPeriod = "month";
const initialPeriodStartMs = startOfPeriod(new Date(), initialPeriod);
const initialRange = periodRange(initialPeriodStartMs, initialPeriod);
let latestRequestId = 0;

export const statisticsStore = createStore<StatisticsStore & StatisticsActions>((set, get) => ({
  selectedCurrencyId: initialCurrencyId,
  period: initialPeriod,
  periodStartMs: initialPeriodStartMs,
  periodEndMs: initialRange.endMs,
  granularity: DEFAULT_GRANULARITY[initialPeriod],
  response: null,
  cache: {},
  loading: false,
  error: null,

  setSelectedCurrencyId: (selectedCurrencyId) => {
    set({ selectedCurrencyId, response: null, error: null });
    void get().fetchStatistics();
  },

  setPeriod: (period) => {
    const periodStartMs = startOfPeriod(new Date(), period);
    const range = periodRange(periodStartMs, period);
    set({
      period,
      periodStartMs,
      periodEndMs: range.endMs,
      granularity: DEFAULT_GRANULARITY[period],
      response: null,
      error: null,
    });
    void get().fetchStatistics();
  },

  previousPeriod: () => {
    const { period, periodStartMs } = get();
    const nextStartMs = shiftPeriod(periodStartMs, period, -1);
    const range = periodRange(nextStartMs, period);
    set({
      periodStartMs: nextStartMs,
      periodEndMs: range.endMs,
      response: null,
      error: null,
    });
    void get().fetchStatistics();
  },

  nextPeriod: () => {
    const { period, periodStartMs } = get();
    if (isCurrentPeriod(periodStartMs, period)) return;

    const nextStartMs = shiftPeriod(periodStartMs, period, 1);
    const range = periodRange(nextStartMs, period);
    set({
      periodStartMs: nextStartMs,
      periodEndMs: range.endMs,
      response: null,
      error: null,
    });
    void get().fetchStatistics();
  },

  setGranularity: (granularity) => {
    const { period } = get();
    if (!PERIOD_GRANULARITIES[period].includes(granularity)) return;

    set({ granularity, response: null, error: null });
    void get().fetchStatistics();
  },

  fetchStatistics: async () => {
    const requestId = ++latestRequestId;
    const { periodStartMs, periodEndMs, selectedCurrencyId, granularity } = get();
    if (selectedCurrencyId === null) {
      const error = "Select a currency to view statistics";
      if (requestId === latestRequestId) set({ error, loading: false });
      return null;
    }

    const key = cacheKey(periodStartMs, periodEndMs, selectedCurrencyId, granularity);
    const cached = get().cache[key];
    if (cached) {
      if (requestId === latestRequestId) set({ response: cached, error: null, loading: false });
      return cached;
    }

    set({ loading: true, error: null });
    try {
      const response = (await invoke("get_statistics", {
        startMs: periodStartMs,
        endMs: periodEndMs,
        currencyId: selectedCurrencyId,
        granularity,
        options: null,
      })) as StatisticsResponse;

      set((state) => ({
        response: requestId === latestRequestId ? response : state.response,
        cache: { ...state.cache, [key]: response },
        loading: requestId === latestRequestId ? false : state.loading,
        error: requestId === latestRequestId ? null : state.error,
      }));
      return response;
    } catch (error) {
      logger.error("Failed to load statistics", error);
      if (requestId === latestRequestId) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
  },

  invalidate: () => {
    latestRequestId += 1;
    set({ cache: {}, response: null, loading: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
