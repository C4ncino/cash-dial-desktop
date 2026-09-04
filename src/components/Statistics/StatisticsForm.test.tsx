import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stores = vi.hoisted(() => ({
  currencyState: {
    currencies: [{ id: 1, code: "USD", symbol: "$", name: "US Dollar" }],
  },
  statisticsState: {
    selectedCurrencyId: 1,
    period: "month" as "week" | "month" | "year",
    periodStartMs: new Date(2026, 7, 1).getTime(),
    periodEndMs: new Date(2026, 8, 1).getTime(),
    granularity: "day" as "day" | "month",
    response: null,
    loading: false,
    error: null as string | null,
    setSelectedCurrencyId: vi.fn(),
    setPeriod: vi.fn((period: "week" | "month" | "year") => {
      stores.statisticsState.period = period;
      stores.statisticsState.granularity = period === "year" ? "month" : "day";
    }),
    setPeriodStart: vi.fn(),
    previousPeriod: vi.fn(),
    nextPeriod: vi.fn(),
    setGranularity: vi.fn(),
    fetchStatistics: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("zustand", () => ({
  useStore: (store: { getState: () => unknown }, selector?: (state: any) => unknown) =>
    selector ? selector(store.getState()) : store.getState(),
}));
vi.mock("@/stores/currencyStore", () => ({
  currencyStore: { getState: () => stores.currencyState },
}));
vi.mock("@/stores/statisticsStore", () => ({
  statisticsStore: { getState: () => stores.statisticsState },
}));
vi.mock("react-chartjs-2", () => ({
  Bar: () => <div data-testid="trends-chart" />,
}));

import StatisticsForm from "@/components/Statistics/StatisticsForm";
import TrendsChart from "@/components/Statistics/TrendsChart";

describe("StatisticsForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 13));
    stores.statisticsState.period = "month";
    stores.statisticsState.periodStartMs = new Date(2026, 7, 1).getTime();
    stores.statisticsState.periodEndMs = new Date(2026, 8, 1).getTime();
    stores.statisticsState.granularity = "day";
    stores.statisticsState.setPeriod.mockClear();
    stores.statisticsState.setPeriodStart.mockClear();
    stores.statisticsState.fetchStatistics.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on the current month and disables next-period navigation", () => {
    render(<StatisticsForm />);

    expect(screen.getByRole("combobox", { name: "Periodo" })).toHaveValue("month");
    expect(document.querySelector('time[datetime^="2026-08-01"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next period" })).toBeDisabled();
    expect(screen.getByLabelText("Mes")).toHaveAttribute("type", "month");
    expect(screen.getByLabelText("Mes")).toHaveValue("2026-08");
  });

  it("selects a period directly with the picker for each period type", () => {
    const { rerender } = render(<StatisticsForm />);
    fireEvent.change(screen.getByLabelText("Mes"), { target: { value: "2025-03" } });
    expect(stores.statisticsState.setPeriodStart).toHaveBeenCalledWith(
      new Date(2025, 2, 1).getTime(),
    );

    stores.statisticsState.period = "week";
    stores.statisticsState.periodStartMs = new Date(2025, 11, 29).getTime();
    rerender(<StatisticsForm />);
    const week = screen.getByLabelText("Semana");
    expect(week).toHaveAttribute("type", "week");
    expect(week).toHaveValue("2026-W01");

    stores.statisticsState.period = "year";
    stores.statisticsState.periodStartMs = new Date(2025, 0, 1).getTime();
    rerender(<StatisticsForm />);
    const year = screen.getByRole("spinbutton", { name: "Año" });
    expect(year).toHaveValue(2025);
    expect(year).toHaveAttribute("max", "2026");
  });

  it("changes period ranges and restricts chart granularity", () => {
    const { rerender } = render(
      <>
        <StatisticsForm />
        <TrendsChart points={[{ bucketStartMs: 0, income: 1, expense: 1, net: 0 }]} />
      </>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Periodo" }), {
      target: { value: "week" },
    });
    expect(stores.statisticsState.setPeriod).toHaveBeenCalledWith("week");
    rerender(
      <>
        <StatisticsForm />
        <TrendsChart points={[{ bucketStartMs: 0, income: 1, expense: 1, net: 0 }]} />
      </>,
    );
    const weekGranularity = screen.getByRole("combobox", { name: "Agrupar por" });
    expect(weekGranularity).toHaveValue("day");
    expect(within(weekGranularity).getByRole("option", { name: "Día" })).toBeInTheDocument();
    expect(
      within(weekGranularity).queryByRole("option", { name: "Month" }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Periodo" }), {
      target: { value: "year" },
    });
    rerender(
      <>
        <StatisticsForm />
        <TrendsChart points={[{ bucketStartMs: 0, income: 1, expense: 1, net: 0 }]} />
      </>,
    );
    const yearGranularity = screen.getByRole("combobox", { name: "Agrupar por" });
    expect(yearGranularity).toHaveValue("month");
    expect(within(yearGranularity).getByRole("option", { name: "Semana" })).toBeInTheDocument();
    expect(within(yearGranularity).getByRole("option", { name: "Mes" })).toBeInTheDocument();
  });
});
