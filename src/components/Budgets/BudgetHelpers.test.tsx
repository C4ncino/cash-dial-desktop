import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import BudgetActions from "@/components/Budgets/BudgetActions";
import BudgetMeter from "@/components/Budgets/BudgetMeter";

let confirmDelete: (() => Promise<void>) | undefined;
const remove = vi.fn();

vi.mock("webcoreui/react", () => ({
  Progress: ({ value, color }: { value: number; color: string }) => (
    <div data-testid="progress" data-value={value} data-color={color} />
  ),
}));
vi.mock("@/components/Forms/ConfirmModal", () => ({
  default: ({ onConfirm }: { onConfirm: () => Promise<void> }) => {
    confirmDelete = onConfirm;
    return <button type="button">Eliminar</button>;
  },
}));
vi.mock("@/stores/budgetStore", () => ({
  budgetStore: { getState: () => ({ remove }) },
}));

describe("budget helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    remove.mockResolvedValue(undefined);
    window.history.pushState({}, "", "/budget?id=7");
    vi.mocked(useStore).mockImplementation((_store: unknown, selector: (state: any) => unknown) =>
      selector({ budgets: [{ budget: { id: 7 } }] }),
    );
  });

  it("renders remaining, threshold progress, and over-budget values", () => {
    const { rerender } = render(<BudgetMeter spent={24} limit={100} currencyCode="MXN" />);
    expect(screen.getByTestId("progress")).toHaveAttribute("data-value", "24");
    expect(screen.getByText(/76.*restante/)).toBeInTheDocument();
    rerender(<BudgetMeter spent={125} limit={100} currencyCode="MXN" />);
    expect(screen.getByTestId("progress")).toHaveAttribute("data-value", "100");
    expect(screen.getByText(/Excedido por 25/)).toBeInTheDocument();
  });

  it("handles a zero limit without invalid progress output", () => {
    render(<BudgetMeter spent={0} limit={0} currencyCode="MXN" />);
    expect(screen.getByTestId("progress")).toHaveAttribute("data-value", "0");
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it("deletes before navigating and does not navigate on failure", async () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    render(<BudgetActions />);
    await act(async () => confirmDelete?.());
    expect(remove).toHaveBeenCalledWith(7);
    expect(back).toHaveBeenCalledTimes(1);

    back.mockClear();
    remove.mockRejectedValueOnce(new Error("delete failed"));
    await expect(confirmDelete?.()).rejects.toThrow("delete failed");
    expect(back).not.toHaveBeenCalled();
  });
});
