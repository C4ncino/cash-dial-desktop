import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-chartjs-2", () => ({
  Bar: () => <div data-testid="trends-chart" />,
  Line: () => <div data-testid="balance-trend-chart" />,
  Pie: () => <div data-testid="categories-pie-chart" />,
}));

vi.mock("@/hooks/useStatisticsSection", () => ({
  useStatisticsSection: () => ({ response: null, loading: false, symbol: "$" }),
}));

vi.mock("zustand", () => ({
  useStore: (store: unknown, selector?: (state: unknown) => unknown) => {
    if (!selector) return undefined;
    if (store === categoryStore) {
      const categories = [
        { id: 1, name: "Food", icon: "food", color: "#ff0000" },
        { id: 2, name: "Transport", icon: "car", color: "#00ff00" },
        { id: 3, name: "Taxi", icon: "car", color: "#0000ff" },
        { id: 4, name: "Restaurants", icon: "restaurant", color: "#ffffff" },
      ];
      return selector({
        categories,
        getById(id: number) {
          return categories.find((category) => category.id === id);
        },
      });
    }
    if (store === accountsStore) {
      return selector({
        accounts: [{ id: 1, name: "Cash", type: { icon: "wallet" } }],
      });
    }
    return selector({ period: "month", granularity: "day" });
  },
}));

vi.mock("@/stores/categoryStore", () => ({
  categoryStore: {},
}));

vi.mock("@/stores/accountsStore", () => ({
  accountsStore: {},
}));

import BalanceTrend from "@/components/Statistics/BalanceTrend";
import CategoriesList from "@/components/Statistics/CategoriesList";
import { categoryStore } from "@/stores/categoryStore";
import { accountsStore } from "@/stores/accountsStore";
import ObligationsList from "@/components/Statistics/ObligationsList";
import OverviewCard from "@/components/Statistics/OverviewCard";
import SecondaryMetrics from "@/components/Statistics/SecondaryMetrics";
import TrendsChart from "@/components/Statistics/TrendsChart";

const overview: StatisticsOverview = {
  income: 1000,
  expenses: 400,
  netCashFlow: 600,
  savingsRate: 60,
};
const metrics: StatisticsSecondaryMetrics = {
  movementCount: 5,
  transactionCount: 4,
  avgExpense: 100,
  avgDailySpending: 40,
  highestSpendingDay: { bucketStartMs: 0, amount: 150 },
  largestExpense: { movementId: 1, amount: 200, timestamp: 0 },
};

describe("statistics components", () => {
  it("renders overview values and savings rate", () => {
    render(<OverviewCard overview={overview} symbol="$" />);
    expect(screen.getByText("$1000.00")).toBeInTheDocument();
    expect(screen.getByText("60.00%")).toBeInTheDocument();
  });

  it("renders trends and category percentages", () => {
    const { rerender } = render(<TrendsChart />);
    rerender(<TrendsChart points={[{ bucketStartMs: 0, income: 100, expense: 50, net: 50 }]} />);
    expect(screen.getByTestId("trends-chart")).toBeInTheDocument();
    render(
      <CategoriesList
        categories={[
          {
            categoryId: 1,
            name: "Food",
            parentId: null,
            amount: 50,
            percentOfTotal: 25,
            isVirtual: false,
            children: [
              {
                categoryId: -1,
                name: "General",
                parentId: 1,
                amount: 10,
                percentOfTotal: 5,
                isVirtual: true,
                children: [],
              },
              {
                categoryId: 4,
                name: "Restaurants",
                parentId: 1,
                amount: 40,
                percentOfTotal: 20,
                isVirtual: false,
                children: [],
              },
            ],
          },
          {
            categoryId: 2,
            name: "Transport",
            parentId: null,
            amount: 75,
            percentOfTotal: 37.5,
            isVirtual: false,
            children: [
              {
                categoryId: 3,
                name: "Taxi",
                parentId: 2,
                amount: 75,
                percentOfTotal: 37.5,
                isVirtual: false,
                children: [],
              },
            ],
          },
        ]}
        symbol="$"
      />,
    );
    expect(screen.getByTestId("categories-pie-chart")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent?.trim())).toEqual([
      "TransportDetalles$75.0037.5%",
      "FoodDetalles$50.0025.0%",
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Food.*Detalles/ }));
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restablecer selección de categoría" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contraer Food/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Contraer Food/ }));
    expect(screen.queryByText("General")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Restablecer selección de categoría" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Food.*Detalles/ }));
    fireEvent.click(screen.getByRole("button", { name: /Transport.*Detalles/ }));
    expect(screen.getByText("Taxi")).toBeInTheDocument();
    expect(screen.queryByText("General")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restablecer selección de categoría" }));
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("renders the cumulative balance trend", () => {
    render(
      <BalanceTrend
        points={[
          { bucketStartMs: 0, balance: 100 },
          { bucketStartMs: 86_400_000, balance: -25 },
        ]}
        symbol="$"
      />,
    );
    expect(screen.getByRole("region", { name: "Saldo a lo largo del tiempo" })).toBeInTheDocument();
    expect(screen.getByTestId("balance-trend-chart")).toBeInTheDocument();
  });

  it("renders obligations and secondary metrics", () => {
    render(
      <ObligationsList
        obligations={{
          totals: { next7Days: 10, next30Days: 20, next90Days: 30 },
          items: [
            {
              installmentId: 1,
              movementId: 2,
              accountId: 1,
              dueTimestamp: 0,
              amount: 10,
              paid: false,
              description: null,
              categoryId: 1,
            },
          ],
        }}
        symbol="$"
      />,
    );
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByTestId("obligation-metric-7")).toHaveTextContent("$10.00");
    expect(screen.getByTestId("obligation-metric-30")).toHaveTextContent("$20.00");
    expect(screen.getByTestId("obligation-metric-90")).toHaveTextContent("$30.00");
    expect(screen.getByTestId("obligations-range-bar")).toBeInTheDocument();
    expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
    render(<SecondaryMetrics metrics={metrics} symbol="$" />);
    expect(screen.getByText("Gasto promedio")).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
  });

  it("highlights the earliest obligation and shows urgency labels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15, 12));

    render(
      <ObligationsList
        obligations={{
          totals: { next7Days: 100, next30Days: 250, next90Days: 500 },
          items: [
            {
              installmentId: 3,
              movementId: 3,
              accountId: 1,
              dueTimestamp: new Date(2026, 7, 25).getTime(),
              amount: 75,
              paid: false,
              description: "Internet",
              categoryId: 1,
            },
            {
              installmentId: 1,
              movementId: 1,
              accountId: 1,
              dueTimestamp: new Date(2026, 7, 15).getTime(),
              amount: 125,
              paid: false,
              description: "Netflix",
              categoryId: 1,
            },
            {
              installmentId: 2,
              movementId: 2,
              accountId: 1,
              dueTimestamp: new Date(2026, 7, 16).getTime(),
              amount: 50,
              paid: false,
              description: "Tarjeta",
              categoryId: 1,
            },
          ],
        }}
        symbol="$"
      />,
    );

    expect(screen.getByText("Próxima")).toBeInTheDocument();
    expect(screen.getByText("Netflix").closest("li")).toHaveTextContent("Hoy");
    expect(screen.getByText("Netflix").closest("li")).toHaveTextContent("$125.00");
    expect(screen.getByText(/Mañana/)).toBeInTheDocument();
    expect(screen.queryByText("Internet")).not.toBeInTheDocument();
    const laterObligationsButton = screen.getByRole("button", {
      name: "Mostrar Obligaciones de 8–30 días",
    });
    expect(laterObligationsButton).toBeInTheDocument();
    fireEvent.click(laterObligationsButton);
    expect(screen.getByText("Internet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar Obligaciones de 8–30 días" }));
    expect(screen.queryByText("Internet")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /vence hoy/ })).toHaveAttribute(
      "data-urgency",
      "today",
    );

    vi.useRealTimers();
  });

  it("handles zero totals without invalid progress values and renders the empty state", () => {
    render(
      <ObligationsList
        obligations={{
          totals: { next7Days: 0, next30Days: 0, next90Days: 0 },
          items: [],
        }}
        symbol="$"
      />,
    );

    expect(screen.getByText("No hay próximas obligaciones.")).toBeInTheDocument();
    expect(screen.getByTestId("obligations-range-bar")).toBeInTheDocument();
    expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
    expect(screen.queryByText("Otras obligaciones")).not.toBeInTheDocument();
  });
});
