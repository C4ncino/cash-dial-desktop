import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import { useStatisticsSection } from "@/hooks/useStatisticsSection";
import { currencyStore } from "@/stores/currencyStore";
import { statisticsStore } from "@/stores/statisticsStore";

const fetchStatistics = vi.fn();

vi.mock("@/stores/statisticsStore", () => ({
  statisticsStore: {
    getState: () => ({ fetchStatistics }),
  },
}));

vi.mock("@/stores/currencyStore", () => ({ currencyStore: {} }));

describe("useStatisticsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setState({ response = null, loading = false } = {}) {
    vi.mocked(useStore).mockImplementation((store: unknown, selector: (state: any) => unknown) => {
      if (store === statisticsStore) return selector({ response, loading, selectedCurrencyId: 2 });
      if (store === currencyStore)
        return selector({ currencies: [{ id: 2, symbol: "$", code: "MXN" }] });
      return undefined;
    });
  }

  it("fetches once when data is absent and idle", async () => {
    setState();
    const { result } = renderHook(() => useStatisticsSection());
    expect(result.current.symbol).toBe("$");
    await waitFor(() => expect(fetchStatistics).toHaveBeenCalledTimes(1));
  });

  it("does not fetch while loading or when a response exists", () => {
    setState({ loading: true });
    const first = renderHook(() => useStatisticsSection());
    first.unmount();
    setState({ response: {} as any });
    renderHook(() => useStatisticsSection());
    expect(fetchStatistics).not.toHaveBeenCalled();
  });

  it("returns an undefined symbol for a missing selected currency", () => {
    vi.mocked(useStore).mockImplementation((store: unknown, selector: (state: any) => unknown) =>
      store === statisticsStore
        ? selector({ response: {}, loading: false, selectedCurrencyId: 99 })
        : selector({ currencies: [] }),
    );
    expect(renderHook(() => useStatisticsSection()).result.current.symbol).toBeUndefined();
  });
});
