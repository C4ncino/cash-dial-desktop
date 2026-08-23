import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import BudgetsList from "@/components/Budgets/BudgetsList";
import { budgetStore } from "@/stores/budgetStore";

vi.mock("@/components/Budgets/BudgetCard", () => ({
  default: ({ budget }: { budget: BudgetDetails }) => (
    <div data-testid={`budget-${budget.budget.id}`}>{budget.budget.name}</div>
  ),
}));

vi.mock("zustand");

const mockUseStore = (budgets: BudgetDetails[] = []) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store && store === budgetStore) {
      return selector({ budgets });
    }
    return undefined;
  });
};

describe("BudgetsList", () => {
  it("renders an empty state when no budgets", () => {
    mockUseStore([]);
    render(<BudgetsList />);
    expect(screen.getByText("Aún no tienes presupuestos.")).toBeInTheDocument();
  });

  it("renders a BudgetCard for each budget", () => {
    const budgets: BudgetDetails[] = [
      {
        budget: { id: 1, budgetPeriodTypeId: 1, categoryId: 1, currencyId: 1, name: "A" },
        periods: [],
      },
      {
        budget: { id: 2, budgetPeriodTypeId: 1, categoryId: 1, currencyId: 1, name: "B" },
        periods: [],
      },
    ];

    mockUseStore(budgets);
    render(<BudgetsList />);

    expect(screen.getByTestId("budget-1")).toBeInTheDocument();
    expect(screen.getByTestId("budget-2")).toBeInTheDocument();
  });
});
