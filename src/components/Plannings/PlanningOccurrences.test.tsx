import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import PlanningOccurrences from "@/components/Plannings/PlanningOccurrences";
import { planningsStore } from "@/stores/planningsStore";
import { MOVEMENT_TYPES, PLANNINGS_RECURRING_TYPES, PLANNING_STATUS } from "@/types/enums";

vi.mock("@/components/Forms/ConfirmModal", () => ({
  default: ({ buttonTitle, onConfirm }: { buttonTitle: string; onConfirm: () => void }) => (
    <button type="button" onClick={onConfirm}>{buttonTitle}</button>
  ),
}));

const occurrence: PlanningOccurrence = {
  id: 10,
  planningId: 7,
  movementId: null,
  statusId: PLANNING_STATUS.PENDING,
  expectedDate: new Date("2026-08-15T00:00:00").getTime(),
  isOverdue: true,
};

const planning: Planning = {
  id: 7,
  typeId: MOVEMENT_TYPES.EXPENSE,
  accountId: 1,
  categoryId: 1,
  currencyId: 1,
  name: "Rent",
  amount: 12000,
  recurringRule: {
    id: 1,
    recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
    intervalStep: 1,
    startDate: new Date("2026-01-15T00:00:00").getTime(),
    endDate: null,
    isActive: true,
    weekDays: [],
    monthDays: [15],
    yearDays: [],
  },
  currentOccurrence: occurrence,
};

const history: PlanningOccurrence[] = [
  { ...occurrence, id: 8, statusId: PLANNING_STATUS.COMPLETED, movementId: 42 },
  { ...occurrence, id: 9, statusId: PLANNING_STATUS.CANCELED, movementId: null },
];

describe("PlanningOccurrences", () => {
  const getOccurrences = vi.fn().mockResolvedValue(history);
  const cancelOccurrence = vi.fn().mockResolvedValue({ ...occurrence, statusId: PLANNING_STATUS.CANCELED });

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/planning-detail?id=7");
    vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
      if (store === planningsStore) {
        return selector({
          plannings: [planning],
          occurrencesByPlanning: { 7: history },
        });
      }
      return undefined;
    });
    vi.spyOn(planningsStore, "getState").mockReturnValue({
      get: vi.fn().mockResolvedValue(planning),
      getOccurrences,
      cancelOccurrence,
    } as never);
  });

  it("loads and renders the current occurrence and history", async () => {
    render(<PlanningOccurrences />);

    expect(screen.getByTestId("planning-occurrences")).toBeInTheDocument();
    expect(screen.getByText("Completar con movimiento")).toBeInTheDocument();
    expect(screen.getByText("Cancelar ocurrencia")).toBeInTheDocument();
    expect(screen.getByText("Ver movimiento")).toHaveAttribute("href", "/movement?id=42");
    await waitFor(() => expect(getOccurrences).toHaveBeenCalledWith(7));
  });

  it("emits a movement-create event for the current occurrence", () => {
    const listener = vi.fn();
    window.addEventListener("planning:movement-create", listener);
    render(<PlanningOccurrences />);

    fireEvent.click(screen.getByText("Completar con movimiento"));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      detail: { planningId: 7, occurrenceId: 10, amount: 12000 },
    });
    window.removeEventListener("planning:movement-create", listener);
  });

  it("cancels the current occurrence", async () => {
    render(<PlanningOccurrences />);

    fireEvent.click(screen.getByText("Cancelar ocurrencia"));

    await waitFor(() => expect(cancelOccurrence).toHaveBeenCalledWith(10, 7));
  });
});
