import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import BudgetInfo from "@/components/Budgets/BudgetInfo";
import { budgetStore } from "@/stores/budgetStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";

vi.mock("zustand");

const mockUseStore = ({ budget, category, currency }: any) => {
  // mock implementation that dispatches based on which store is passed to useStore
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === budgetStore) {
      const stateForBudget = {
        budgets: [budget],
        periodTypes: budget ? [{ id: 1, name: "Monthly" }] : [],
      };
      return selector(stateForBudget);
    }

    if (store === categoryStore) {
      const catState = { getById: () => category };
      return selector(catState);
    }

    if (store === currencyStore) {
      const curState = { getById: () => currency };
      return selector(curState);
    }

    // fallback
    return selector({});
  });
};

describe("BudgetInfo", () => {
  it("renders budget header with name and period", () => {
    const budget = {
      budget: { id: 1, budgetPeriodTypeId: 1, categoryId: 1, currencyId: 1, name: "Test" },
      periods: [{ startDate: 0, endDate: 1, amountLimit: 200, amountSpend: 50, movementIds: [] }],
    };
    const category = { id: 1, name: "Food", icon: "food", color: "#fff" };
    const currency = { id: 1, code: "USD" };

    mockUseStore({ budget, category, currency });

    // ensure URL contains id so component reads it
    window.history.pushState({}, "", "?id=1");

    // mock budgetStore.getState to include periodTypes used by the component
    vi.spyOn(budgetStore, "getState").mockReturnValue({
      periodTypes: [{ id: 1, name: "Monthly" }],
    } as any);

    render(<BudgetInfo />);

    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText(/200(?:\.00)?/)).toBeInTheDocument();

    // restore the spy
    (budgetStore.getState as any).mockRestore && (budgetStore.getState as any).mockRestore();
  });
});
