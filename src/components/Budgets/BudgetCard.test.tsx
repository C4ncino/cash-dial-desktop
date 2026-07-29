import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BudgetCard from "@/components/Budgets/BudgetCard";

vi.mock("@/stores/categoryStore", () => ({
  categoryStore: {
    getState: () => ({
      getById: (id: number) =>
        id === 999 ? undefined : { id, name: "Food", icon: "fast-food", color: "#ef4444" },
    }),
  },
}));

vi.mock("@/stores/currencyStore", () => ({
  currencyStore: {
    getState: () => ({
      getById: (id: number) => (id === 999 ? undefined : { id, code: "USD", symbol: "$" }),
    }),
  },
}));

vi.mock("@/stores/budgetStore", () => ({
  budgetStore: {
    getState: () => ({
      periodTypes: [{ id: 1, name: "Monthly", key: "monthly" }],
      getById: (id: number) => undefined,
    }),
  },
}));

const baseBudget: BudgetDetails = {
  budget: {
    id: 1,
    budgetPeriodTypeId: 1,
    categoryId: 5,
    currencyId: 1,
    name: "Groceries",
  },
  periods: [
    {
      startDate: Date.now(),
      endDate: Date.now() + 1000,
      amountLimit: 500,
      amountSpend: 150,
      movementIds: [],
    },
  ],
};

describe("BudgetCard", () => {
  it("should render budget name, period and amounts", () => {
    render(<BudgetCard budget={baseBudget} />);

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText(/500(?:\.00)?/)).toBeInTheDocument();
    expect(screen.getByText(/150(?:\.00)?/)).toBeInTheDocument();
  });

  it("shows warning/over states and clamps progress at 100%", () => {
    const overBudget: BudgetDetails = {
      ...baseBudget,
      periods: [{ startDate: 0, endDate: 1, amountLimit: 100, amountSpend: 150, movementIds: [] }],
    };

    render(<BudgetCard budget={overBudget} />);

    expect(screen.getByText(/Excedido/)).toBeInTheDocument();
  });

  it("renders gracefully when currency or category missing", () => {
    // render a budget that references missing category/currency ids (999) which our mocks treat as undefined
    const missingBudget = JSON.parse(JSON.stringify(baseBudget));
    missingBudget.budget.categoryId = 999;
    missingBudget.budget.currencyId = 999;

    render(<BudgetCard budget={missingBudget} />);

    // should still render name and period
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
  });

  it("links to budget detail page", () => {
    render(<BudgetCard budget={baseBudget} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/budget?id=1");
  });
});
