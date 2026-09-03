import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import SelectPlanning from "@/components/Movements/SelectPlanning";
import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";
import { planningsStore } from "@/stores/planningsStore";
import { MOVEMENT_TYPES, PLANNING_STATUS, PLANNINGS_RECURRING_TYPES } from "@/types/enums";

const activePlanning: Planning = {
  id: 7,
  typeId: MOVEMENT_TYPES.EXPENSE,
  accountId: 2,
  categoryId: 4,
  currencyId: 1,
  name: "Rent",
  amount: 12000,
  recurringRule: {
    id: 1,
    recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
    intervalStep: 1,
    startDate: 0,
    endDate: null,
    isActive: true,
    weekDays: [],
    monthDays: [15],
    yearDays: [],
  },
  currentOccurrence: {
    id: 10,
    planningId: 7,
    movementId: null,
    statusId: PLANNING_STATUS.PENDING,
    expectedDate: new Date("2026-08-15T00:00:00").getTime(),
    isOverdue: false,
  },
};

describe("SelectPlanning", () => {
  beforeEach(() => {
    vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
      if (store === planningsStore) return selector({ plannings: [activePlanning] });
      if (store === accountsStore) return selector({ accounts: [{ id: 2, name: "Checking" }] });
      if (store === currencyStore)
        return selector({ currencies: [{ id: 1, symbol: "$", code: "MXN" }] });
      return undefined;
    });
  });

  it("shows only active pending plannings matching the movement type", () => {
    render(<SelectPlanning typeId={MOVEMENT_TYPES.EXPENSE} />);
    expect(screen.getByRole("option", { name: /Rent/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sin planificación" })).toBeInTheDocument();
  });

  it("returns the selected planning and supports clearing it", () => {
    const onChange = vi.fn();
    render(<SelectPlanning typeId={MOVEMENT_TYPES.EXPENSE} onChange={onChange} />);
    const select = screen.getByRole("combobox");

    fireEvent.change(select, { target: { value: "7" } });
    expect(onChange).toHaveBeenLastCalledWith(7, activePlanning);

    fireEvent.change(select, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(undefined, undefined);
  });
});
