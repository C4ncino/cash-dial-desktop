import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PlanningRecurrenceForm from "@/components/Plannings/PlanningRecurrenceForm";
import { PLANNINGS_RECURRING_TYPES } from "@/types/enums";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}));

describe("PlanningRecurrenceForm", () => {
  const baseProps = {
    recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
    intervalStep: 1,
    startDate: 1770000000000,
    endDate: null,
    weekDays: [],
    monthDays: [15],
    yearDays: [],
    onRecurringTypeChange: vi.fn(),
    onIntervalStepChange: vi.fn(),
    onStartDateChange: vi.fn(),
    onEndDateChange: vi.fn(),
    onWeekDaysChange: vi.fn(),
    onMonthDaysChange: vi.fn(),
    onYearDaysChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders recurrence type buttons", () => {
    render(<PlanningRecurrenceForm {...baseProps} />);
    expect(screen.getByText("Diario")).toBeInTheDocument();
    expect(screen.getByText("Semanal")).toBeInTheDocument();
    expect(screen.getByText("Mensual")).toBeInTheDocument();
    expect(screen.getByText("Anual")).toBeInTheDocument();
  });

  it("calls onRecurringTypeChange and clears stale fields when switching recurrence type", () => {
    render(<PlanningRecurrenceForm {...baseProps} />);

    fireEvent.click(screen.getByText("Semanal"));
    expect(baseProps.onRecurringTypeChange).toHaveBeenCalledWith(PLANNINGS_RECURRING_TYPES.WEEKLY);
    expect(baseProps.onMonthDaysChange).toHaveBeenCalledWith([]);
    expect(baseProps.onYearDaysChange).toHaveBeenCalledWith([]);
  });

  it("clears weekday selections when switching from weekly to monthly", () => {
    render(
      <PlanningRecurrenceForm
        {...baseProps}
        recurringTypeId={PLANNINGS_RECURRING_TYPES.WEEKLY}
        weekDays={[0, 2]}
      />,
    );

    fireEvent.click(screen.getByText("Mensual"));

    expect(baseProps.onRecurringTypeChange).toHaveBeenCalledWith(PLANNINGS_RECURRING_TYPES.MONTHLY);
    expect(baseProps.onWeekDaysChange).toHaveBeenCalledWith([]);
    expect(baseProps.onYearDaysChange).toHaveBeenCalledWith([]);
  });

  it("renders weekday picker when weekly type is active and toggles days", () => {
    render(
      <PlanningRecurrenceForm
        {...baseProps}
        recurringTypeId={PLANNINGS_RECURRING_TYPES.WEEKLY}
        weekDays={[0]}
      />,
    );

    expect(screen.getByText("Días de la semana")).toBeInTheDocument();
    const wednesdayBtn = screen.getByText("Mié");
    fireEvent.click(wednesdayBtn);

    expect(baseProps.onWeekDaysChange).toHaveBeenCalledWith([0, 2]);

    const mondayBtn = screen.getByText("Lun");
    fireEvent.click(mondayBtn);
    expect(baseProps.onWeekDaysChange).toHaveBeenCalledWith([]);
  });

  it("renders month day picker when monthly type is active and toggles days", () => {
    render(
      <PlanningRecurrenceForm
        {...baseProps}
        recurringTypeId={PLANNINGS_RECURRING_TYPES.MONTHLY}
        monthDays={[15]}
      />,
    );

    expect(screen.getByText("Días del mes (1 - 28)")).toBeInTheDocument();
    const day1Btn = screen.getByText("1");
    fireEvent.click(day1Btn);

    expect(baseProps.onMonthDaysChange).toHaveBeenCalledWith([1, 15]);
  });

  it("renders yearly picker and allows adding and removing dates", () => {
    render(
      <PlanningRecurrenceForm
        {...baseProps}
        recurringTypeId={PLANNINGS_RECURRING_TYPES.YEARLY}
        yearDays={[{ month: 3, dayOfMonth: 15 }]}
      />,
    );

    expect(screen.getByText("Fechas del año")).toBeInTheDocument();
    expect(screen.getByText("15 de Marzo")).toBeInTheDocument();

    const addBtn = screen.getByText("Agregar");
    fireEvent.click(addBtn);

    expect(baseProps.onYearDaysChange).toHaveBeenCalled();
  });

  it("handles interval step input changes", () => {
    render(<PlanningRecurrenceForm {...baseProps} />);

    const intervalInput = screen.getByRole("spinbutton");
    fireEvent.change(intervalInput, { target: { value: "3" } });

    expect(baseProps.onIntervalStepChange).toHaveBeenCalledWith(3);
  });

  it("toggles end date checkbox", () => {
    render(<PlanningRecurrenceForm {...baseProps} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(baseProps.onEndDateChange).toHaveBeenCalled();
  });
});
