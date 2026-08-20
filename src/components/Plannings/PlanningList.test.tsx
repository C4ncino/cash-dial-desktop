import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import PlanningList from "@/components/Plannings/PlanningList";
import { planningsStore } from "@/stores/planningsStore";
import { MOVEMENT_TYPES, PLANNINGS_RECURRING_TYPES, PLANNING_STATUS } from "@/types/enums";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}));

const mockPlannings: Planning[] = [
  {
    id: 1,
    typeId: MOVEMENT_TYPES.EXPENSE,
    accountId: 1,
    categoryId: 10,
    currencyId: 1,
    name: "Renta de Departamento",
    amount: 12000.0,
    recurringRule: {
      id: 1,
      recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
      intervalStep: 1,
      startDate: 1770000000000,
      endDate: null,
      isActive: true,
      weekDays: [],
      monthDays: [1],
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
  },
  {
    id: 2,
    typeId: MOVEMENT_TYPES.INCOME,
    accountId: 1,
    categoryId: 5,
    currencyId: 1,
    name: "Sueldo Quincenal",
    amount: 25000.0,
    recurringRule: {
      id: 2,
      recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
      intervalStep: 1,
      startDate: 1770000000000,
      endDate: null,
      isActive: false,
      weekDays: [],
      monthDays: [15],
      yearDays: [],
    },
    currentOccurrence: null,
  },
];

const mockUseStoreState = ({ plannings = mockPlannings }: { plannings?: Planning[] } = {}) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === planningsStore) {
      return selector({
        plannings,
        recurringTypes: [],
        statuses: [],
        occurrencesByPlanning: {},
      });
    }
    return undefined;
  });
};

describe("PlanningList Component", () => {
  beforeEach(() => {
    mockUseStoreState({ plannings: mockPlannings });
    vi.clearAllMocks();
  });

  it("renders list of plannings and filter pills", () => {
    render(<PlanningList />);

    expect(screen.getByText("Todas (2)")).toBeInTheDocument();
    expect(screen.getByText("Renta de Departamento")).toBeInTheDocument();
    expect(screen.getByText("Sueldo Quincenal")).toBeInTheDocument();
  });

  it("filters plannings by search term", () => {
    render(<PlanningList />);

    const searchInput = screen.getByPlaceholderText("Buscar planificación...");
    fireEvent.change(searchInput, { target: { value: "Renta" } });

    expect(screen.getByText("Renta de Departamento")).toBeInTheDocument();
    expect(screen.queryByText("Sueldo Quincenal")).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("Sueldo Quincenal")).toBeInTheDocument();
  });

  it("filters plannings by active and inactive status tabs", () => {
    render(<PlanningList />);

    const activeTab = screen.getByText("Activas");
    fireEvent.click(activeTab);
    expect(screen.getByText("Renta de Departamento")).toBeInTheDocument();
    expect(screen.queryByText("Sueldo Quincenal")).not.toBeInTheDocument();

    const inactiveTab = screen.getByText("Inactivas");
    fireEvent.click(inactiveTab);
    expect(screen.queryByText("Renta de Departamento")).not.toBeInTheDocument();
    expect(screen.getByText("Sueldo Quincenal")).toBeInTheDocument();
  });

  it("renders empty state when store has no plannings", () => {
    mockUseStoreState({ plannings: [] });
    render(<PlanningList />);

    expect(screen.getByText("No se encontraron planificaciones")).toBeInTheDocument();
    expect(screen.getByText("Crear primera planificación")).toBeInTheDocument();
  });
});
