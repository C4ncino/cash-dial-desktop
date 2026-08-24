import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import PlanningCard, { formatRecurrenceRuleSummary } from "@/components/Plannings/PlanningCard";
import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";
import { MOVEMENT_TYPES, PLANNING_STATUS, PLANNINGS_RECURRING_TYPES } from "@/types/enums";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}));

const mockPlanning: Planning = {
  id: 1,
  typeId: MOVEMENT_TYPES.EXPENSE,
  accountId: 1,
  categoryId: 10,
  currencyId: 1,
  name: "Gimnasio",
  amount: 450.0,
  recurringRule: {
    id: 1,
    recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
    intervalStep: 1,
    startDate: 1770000000000,
    endDate: null,
    isActive: true,
    weekDays: [],
    monthDays: [5],
    yearDays: [],
  },
  currentOccurrence: {
    id: 101,
    planningId: 1,
    movementId: null,
    statusId: PLANNING_STATUS.PENDING,
    expectedDate: 1770000000000,
    isOverdue: false,
  },
};

const mockUseStoreState = () => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === accountsStore) {
      return selector({
        accounts: [
          {
            id: 1,
            name: "Main Debit",
            type: { id: 2, name: "Debit" },
            balance: 5000,
            currencyId: 1,
            isActive: true,
            creditInfo: null,
          },
        ],
      });
    }
    if (store === categoryStore) {
      return selector({
        getById: (id: number) => ({
          id,
          name: "Salud",
          icon: "heart",
          color: "#ef4444",
        }),
      });
    }
    if (store === currencyStore) {
      return selector({
        currencies: [{ id: 1, name: "Peso Mexicano", symbol: "$", code: "MXN" }],
      });
    }
    return undefined;
  });
};

describe("PlanningCard helper formatters", () => {
  it("formats daily recurrence", () => {
    expect(
      formatRecurrenceRuleSummary({
        id: 1,
        recurringTypeId: PLANNINGS_RECURRING_TYPES.DAILY,
        intervalStep: 1,
        startDate: 0,
        isActive: true,
        weekDays: [],
        monthDays: [],
        yearDays: [],
      }),
    ).toBe("Cada día");
  });

  it("formats weekly recurrence with weekdays", () => {
    expect(
      formatRecurrenceRuleSummary({
        id: 1,
        recurringTypeId: PLANNINGS_RECURRING_TYPES.WEEKLY,
        intervalStep: 2,
        startDate: 0,
        isActive: true,
        weekDays: [0, 4],
        monthDays: [],
        yearDays: [],
      }),
    ).toBe("Cada 2 semanas · Lun, Vie");
  });

  it("formats monthly recurrence with monthdays", () => {
    expect(
      formatRecurrenceRuleSummary({
        id: 1,
        recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
        intervalStep: 1,
        startDate: 0,
        isActive: true,
        weekDays: [],
        monthDays: [15],
        yearDays: [],
      }),
    ).toBe("Cada mes · Día 15");
  });

  it("formats yearly recurrence with year days", () => {
    expect(
      formatRecurrenceRuleSummary({
        id: 1,
        recurringTypeId: PLANNINGS_RECURRING_TYPES.YEARLY,
        intervalStep: 1,
        startDate: 0,
        isActive: true,
        weekDays: [],
        monthDays: [],
        yearDays: [{ month: 12, dayOfMonth: 25 }],
      }),
    ).toBe("Cada año · 25 Dic");
  });
});

describe("PlanningCard Component", () => {
  beforeEach(() => {
    mockUseStoreState();
    vi.clearAllMocks();
  });

  it("renders the simplified planning summary", () => {
    render(<PlanningCard planning={mockPlanning} />);

    expect(screen.getByText("Gimnasio")).toBeInTheDocument();
    expect(screen.getByText("Main Debit")).toBeInTheDocument();
    expect(screen.getByText("Salud")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gimnasio/ })).toHaveAttribute(
      "href",
      "/planning-detail?id=1",
    );
    expect(screen.queryByText("Cada mes · Día 5")).not.toBeInTheDocument();
    expect(screen.queryByText("Gasto")).not.toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
  });
});
