import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import BudgetPeriods from "@/components/Budgets/BudgetPeriods";
import { budgetStore } from "@/stores/budgetStore";

vi.mock("zustand");

vi.mock("@/components/Movements/MovementList", () => ({
  default: (props: { movementIds: number[]; needCompact?: boolean }) => (
    <div
      data-testid="movement-list"
      data-ids={JSON.stringify(props.movementIds)}
      data-compact={String(!!props.needCompact)}
    >
      MovementList Mock
    </div>
  ),
}));

const mockUseStore = ({ budget }: { budget: any }) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === budgetStore) {
      return selector({
        budgets: [budget],
      });
    }

    return undefined;
  });
};

describe("BudgetPeriods", () => {
  it("renders periods and passes reversed movementIds with needCompact to MovementList", () => {
    const budget = {
      budget: { id: 1, budgetPeriodTypeId: 1, categoryId: 1, currencyId: 1, name: "Test" },
      periods: [
        { startDate: 0, endDate: 1, amountLimit: 200, amountSpend: 50, movementIds: [1, 2, 3] },
      ],
    };

    mockUseStore({ budget });

    // ensure URL contains id so component reads it
    window.history.pushState({}, "", "?id=1");

    render(<BudgetPeriods />);

    // Period dates should render with a timezone-independent machine-readable value.
    const periodDates = screen.getAllByRole("time");
    expect(periodDates).toHaveLength(2);
    expect(periodDates.map((date) => date.getAttribute("datetime"))).toEqual([
      "1970-01-01",
      "1970-01-01",
    ]);

    // MovementList should be rendered with correct props
    const movementList = screen.getByTestId("movement-list");
    expect(movementList).toBeInTheDocument();
    expect(movementList).toHaveTextContent("MovementList Mock");

    // movementIds should be reversed
    const movementIds = movementList.getAttribute("data-ids");
    if (!movementIds) throw new Error("Movement IDs were not rendered");
    expect(JSON.parse(movementIds)).toEqual([3, 2, 1]);

    // needCompact should be true
    expect(movementList.getAttribute("data-compact")).toBe("true");
  });

  it("shows empty message when period has no movements", () => {
    const budget = {
      budget: { id: 1, budgetPeriodTypeId: 1, categoryId: 1, currencyId: 1, name: "Test" },
      periods: [{ startDate: 0, endDate: 1, amountLimit: 200, amountSpend: 0, movementIds: [] }],
    };

    mockUseStore({ budget });

    window.history.pushState({}, "", "?id=1");

    render(<BudgetPeriods />);

    expect(screen.getByText("No hay movimientos en este periodo.")).toBeInTheDocument();
    expect(screen.queryByTestId("movement-list")).not.toBeInTheDocument();
  });
});
