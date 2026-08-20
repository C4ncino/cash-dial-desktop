import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_GRANULARITY,
  isCurrentPeriod,
  periodRange,
  shiftPeriod,
  startOfPeriod,
} from "@/lib/statisticsQuery";

describe("statisticsQuery", () => {
  afterEach(() => vi.useRealTimers());

  it("starts weeks on Monday from both Sunday and Monday", () => {
    expect(new Date(startOfPeriod(new Date(2026, 7, 23, 12), "week")).getDay()).toBe(1);
    expect(new Date(startOfPeriod(new Date(2026, 7, 24, 12), "week")).getDay()).toBe(1);
    expect(new Date(startOfPeriod(new Date(2026, 7, 23, 12), "week")).getDate()).toBe(17);
  });

  it("starts month and year at local midnight", () => {
    expect(new Date(startOfPeriod(new Date(2026, 7, 19, 12), "month"))).toEqual(
      new Date(2026, 7, 1),
    );
    expect(new Date(startOfPeriod(new Date(2026, 7, 19, 12), "year"))).toEqual(
      new Date(2026, 0, 1),
    );
  });

  it("shifts across leap, month, and year boundaries", () => {
    expect(new Date(shiftPeriod(new Date(2024, 1, 1).getTime(), "month", 1))).toEqual(
      new Date(2024, 2, 1),
    );
    expect(new Date(shiftPeriod(new Date(2026, 0, 1).getTime(), "month", -1))).toEqual(
      new Date(2025, 11, 1),
    );
    expect(new Date(shiftPeriod(new Date(2026, 0, 1).getTime(), "year", -1))).toEqual(
      new Date(2025, 0, 1),
    );
  });

  it("returns half-open ranges for every period", () => {
    for (const period of ["week", "month", "year"] as const) {
      const startMs = startOfPeriod(new Date(2026, 7, 19), period);
      expect(periodRange(startMs, period)).toEqual({
        startMs,
        endMs: shiftPeriod(startMs, period, 1),
      });
    }
  });

  it("recognizes current and future periods", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 19, 12));
    const current = startOfPeriod(new Date(), "month");
    expect(isCurrentPeriod(current, "month")).toBe(true);
    expect(isCurrentPeriod(shiftPeriod(current, "month", 1), "month")).toBe(true);
    expect(isCurrentPeriod(shiftPeriod(current, "month", -1), "month")).toBe(false);
  });

  it("defines a supported default granularity for every period", () => {
    expect(DEFAULT_GRANULARITY).toEqual({ week: "day", month: "day", year: "month" });
  });
});
