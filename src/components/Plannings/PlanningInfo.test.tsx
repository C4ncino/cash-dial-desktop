import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import PlanningInfo from "@/components/Plannings/PlanningInfo";
import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";
import { planningsStore } from "@/stores/planningsStore";
import { MOVEMENT_TYPES, PLANNING_STATUS, PLANNINGS_RECURRING_TYPES } from "@/types/enums";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}));

const planning: Planning = {
  id: 7,
  typeId: MOVEMENT_TYPES.EXPENSE,
  accountId: 2,
  categoryId: 4,
  currencyId: 1,
  name: "Rent",
  amount: 12000,
  recurringRule: {
    id: 9,
    recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
    intervalStep: 1,
    startDate: new Date("2026-01-15T00:00:00").getTime(),
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

const mockStores = (currentPlanning: Planning | null = planning) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === planningsStore)
      return selector({ plannings: currentPlanning ? [currentPlanning] : [] });
    if (store === accountsStore) return selector({ accounts: [{ id: 2, name: "Checking" }] });
    if (store === categoryStore)
      return selector({ getById: () => ({ id: 4, name: "Housing", icon: "home", color: "#fff" }) });
    if (store === currencyStore)
      return selector({ currencies: [{ id: 1, name: "Peso", symbol: "$", code: "MXN" }] });
    return undefined;
  });
};

describe("PlanningInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/planning-detail?id=7");
    mockStores();
  });

  it("renders planning properties and related account/category/currency", () => {
    render(<PlanningInfo />);
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Housing")).toBeInTheDocument();
    expect(screen.getByText("MX$12,000.00")).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId("icon")
        .some((icon) => icon.getAttribute("data-icon") === "iconoir:minus"),
    ).toBe(true);
    expect(screen.getByText("MXN")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it("renders recurrence details and the actionable occurrence status", () => {
    render(<PlanningInfo />);
    expect(screen.getByText("Cada mes · Día 15")).toBeInTheDocument();
    expect(screen.getByText("15 de Enero, 2026")).toBeInTheDocument();
    expect(screen.getByText("Sin fecha límite")).toBeInTheDocument();
    expect(screen.getByText("Gasto planificado")).toBeInTheDocument();
  });

  it("renders nothing when the planning ID cannot be resolved", () => {
    mockStores(null);
    const { container } = render(<PlanningInfo />);
    expect(container).toBeEmptyDOMElement();
  });
});
