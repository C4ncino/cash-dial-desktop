import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import { formatOccurrenceDueDifference } from "@/components/Plannings/UrgentOccurrenceCard";
import UrgentOccurrences, { getUrgentPlannings } from "@/components/Plannings/UrgentOccurrences";
import { planningsStore } from "@/stores/planningsStore";
import { PLANNING_STATUS } from "@/types/enums";

vi.mock("@iconify/react", () => ({ Icon: () => <span /> }));

const planning = (id: number, name: string): Planning => ({
  id,
  name,
  typeId: 2,
  accountId: 1,
  categoryId: 1,
  currencyId: 1,
  amount: 100,
  recurringRule: {
    id,
    recurringTypeId: 3,
    intervalStep: 1,
    startDate: 0,
    endDate: null,
    isActive: true,
    weekDays: [],
    monthDays: [1],
    yearDays: [],
  },
  currentOccurrence: null,
});

const occurrence = (id: number, date: string, isOverdue = false): PlanningOccurrence => ({
  id,
  planningId: id,
  movementId: null,
  statusId: PLANNING_STATUS.PENDING,
  expectedDate: new Date(date).getTime(),
  isOverdue,
});

describe("UrgentOccurrences", () => {
  it("formats the due-date difference", () => {
    const today = new Date("2026-08-17T12:00:00").getTime();
    expect(formatOccurrenceDueDifference(new Date("2026-08-17T18:00:00").getTime(), today)).toBe(
      "Hoy",
    );
    expect(formatOccurrenceDueDifference(new Date("2026-08-18T12:00:00").getTime(), today)).toBe(
      "Mañana",
    );
    expect(formatOccurrenceDueDifference(new Date("2026-08-20T12:00:00").getTime(), today)).toBe(
      "En 3 días",
    );
    expect(formatOccurrenceDueDifference(new Date("2026-08-15T12:00:00").getTime(), today)).toBe(
      "Hace 2 días",
    );
  });

  beforeEach(() => {
    vi.mocked(useStore).mockImplementation((store: any, selector: any) =>
      store === planningsStore
        ? selector({
            plannings: [planning(1, "Rent"), planning(2, "Food")],
            occurrencesByPlanning: {
              1: [occurrence(1, "2026-08-20", true)],
              2: [occurrence(2, "2026-09-20")],
            },
          })
        : undefined,
    );
  });

  it("sorts overdue occurrences first and renders their details and link", () => {
    expect(
      getUrgentPlannings([planning(2, "Food"), planning(1, "Rent")], {
        1: [occurrence(1, "2026-08-20", true)],
        2: [occurrence(2, "2026-09-20")],
      }).map((item) => item.planning.id),
    ).toEqual([1, 2]);
    render(<UrgentOccurrences />);
    expect(screen.getAllByTestId("urgent-occurrence-card")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: /planificaciones/i })).toBeInTheDocument();
    expect(screen.queryByText("Ocurrencia urgente")).not.toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Vencida")).toBeInTheDocument();
    const dueDate = screen.getAllByText(/En \d+ días|Hace \d+ días|Hoy|Mañana|Ayer/)[0];
    expect(dueDate.closest("time")).toHaveAttribute(
      "dateTime",
      new Date("2026-08-20").toISOString(),
    );
    expect(screen.getByRole("link", { name: /Rent/ })).toHaveAttribute(
      "href",
      "/planning-detail?id=1",
    );
  });
});
