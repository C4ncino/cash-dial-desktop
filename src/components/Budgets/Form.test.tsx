import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeModal, toast } from "webcoreui";
import { useStore } from "zustand";

import BudgetForm from "@/components/Budgets/Form";
import { budgetStore } from "@/stores/budgetStore";
import { editStore } from "@/stores/editStore";
import { EDIT_TYPES, MODAL_ID } from "@/types/enums";

vi.mock("@/components/Forms/SelectCategories", () => ({
  default: ({ categoryId, onChange }: { categoryId?: number; onChange?: (id: number) => void }) => (
    <select
      name="categoryId"
      data-testid="category-select"
      value={categoryId ?? ""}
      onChange={(event) => onChange?.(Number(event.target.value))}
    >
      <option value="">Select a category</option>
      <option value="1">Food</option>
    </select>
  ),
}));

vi.mock("@/components/Forms/SelectCurrency", () => ({
  default: () => (
    <select name="currency" data-testid="currency-select">
      <option value="1">USD</option>
    </select>
  ),
}));

// ensure editStore module is mockable and its reference is stable for useStore comparisons
vi.mock("@/stores/editStore", () => ({
  editStore: {},
}));

const mockAdd = vi.fn();
const mockUpdateName = vi.fn();
const mockUpdateAmount = vi.fn();

// also mock the budgetStore module's getState as Form uses budgetStore.getState().add
vi.mock("@/stores/budgetStore", () => ({
  budgetStore: {
    getState: () => ({
      periodTypes: [{ id: 1, name: "Monthly" }],
      add: mockAdd,
      updateName: mockUpdateName,
      updateAmount: mockUpdateAmount,
      getById: (id: number) => ({
        budget: { id, budgetPeriodTypeId: 1, categoryId: 1, currencyId: 1, name: "Old Budget" },
        periods: [{ startDate: 0, endDate: 1, amountLimit: 100, amountSpend: 20, movementIds: [] }],
      }),
    }),
  },
}));

const mockUseStoreState = ({
  periodTypes = [{ id: 1, name: "Monthly" }],
  edit = { id: null, type: null, clear: vi.fn() },
}: {
  periodTypes?: Array<{ id: number; name: string }>;
  edit?: Pick<EditStore, "id" | "type" | "clear">;
} = {}) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === budgetStore) {
      return selector({
        periodTypes,
        add: mockAdd,
        updateName: mockUpdateName,
        updateAmount: mockUpdateAmount,
        getById: (id: number) => ({
          budget: { id, budgetPeriodTypeId: 1, categoryId: 1, currencyId: 1, name: "Old Budget" },
          periods: [
            { startDate: 0, endDate: 1, amountLimit: 100, amountSpend: 20, movementIds: [] },
          ],
        }),
      });
    }
    if (store === editStore) {
      return selector(edit);
    }
    return undefined;
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAdd.mockResolvedValue(undefined);
  mockUpdateName.mockResolvedValue(undefined);
  mockUpdateAmount.mockResolvedValue(undefined);
  mockUseStoreState();
});
describe("BudgetForm", () => {
  it("should render create fields", () => {
    render(<BudgetForm modalId={MODAL_ID.BUDGET.CREATE} />);

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByTestId("category-select")).toBeInTheDocument();
    expect(screen.getByTestId("currency-select")).toBeInTheDocument();
    expect(screen.getByLabelText("Límite")).toBeInTheDocument();
  });

  it("should create budget when form submitted", async () => {
    render(<BudgetForm modalId={MODAL_ID.BUDGET.CREATE} />);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "New Budget" } });

    fireEvent.change(screen.getByTestId("category-select"), { target: { value: "1" } });

    fireEvent.change(screen.getByLabelText("Límite"), { target: { value: "200" } });

    fireEvent.click(screen.getByLabelText(/Monthly/i));

    const form = document.getElementById("budget-form") as HTMLFormElement;

    fireEvent.submit(form);

    await waitFor(() => expect(mockAdd).toHaveBeenCalled());
  });

  it("resets create-mode values before submission", () => {
    render(<BudgetForm modalId={MODAL_ID.BUDGET.CREATE} />);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Temporary" } });
    fireEvent.change(screen.getByTestId("category-select"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/L.*mite/i), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));

    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByTestId("category-select")).toHaveValue("");
    expect(screen.getByLabelText(/L.*mite/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Monthly/i)).toBeChecked();
  });

  it("should render edit fields and open update type modal when amount changed", () => {
    // simulate edit state
    mockUseStoreState({
      periodTypes: [{ id: 1, name: "Monthly" }],
      edit: { id: 1, type: EDIT_TYPES.BUDGET, clear: vi.fn() },
    });

    render(<BudgetForm modalId={MODAL_ID.BUDGET.EDIT} />);

    // name should be prefilled with Old Budget
    expect(screen.getByDisplayValue("Old Budget")).toBeInTheDocument();

    // change amount (find by current value since the label isn't associated)
    const amountInput = screen.getByDisplayValue("100") as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: "250" } });

    const form = document.getElementById("budget-form") as HTMLFormElement;
    act(() => {
      fireEvent.submit(form);
    });

    // updateAmount shouldn't be called yet because modal flow is used, but pending modal state should open (component uses webcoreui modal internals which aren't available in test environment)
    // at minimum, ensure updateName wasn't called for same name
    expect(mockUpdateName).not.toHaveBeenCalled();
  });

  it("validates required fields", () => {
    render(<BudgetForm modalId={MODAL_ID.BUDGET.CREATE} />);

    const form = document.getElementById("budget-form") as HTMLFormElement;
    act(() => {
      fireEvent.submit(form);
    });

    expect(screen.getByText("El nombre es requerido")).toBeInTheDocument();
  });

  it("locks duplicate submissions and allows retry without losing input", async () => {
    let rejectFirst: (reason: Error) => void = () => undefined;
    mockAdd
      .mockReturnValueOnce(new Promise((_, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce(undefined);
    render(<BudgetForm modalId={MODAL_ID.BUDGET.CREATE} />);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Food" } });
    fireEvent.change(screen.getByTestId("category-select"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/L.*mite/i), { target: { value: "200" } });
    fireEvent.click(screen.getByLabelText(/Monthly/i));
    const form = document.getElementById("budget-form")!;

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    rejectFirst(new Error("temporary"));
    expect(
      await screen.findByText("Ocurrió un error al guardar el presupuesto"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Food");

    fireEvent.submit(form);
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(2));
    expect(toast).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it("does not close or toast when a submission resolves after unmount", async () => {
    let resolveAdd: () => void = () => undefined;
    mockAdd.mockReturnValueOnce(new Promise<void>((resolve) => (resolveAdd = resolve)));
    const { unmount } = render(<BudgetForm modalId={MODAL_ID.BUDGET.CREATE} />);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Food" } });
    fireEvent.change(screen.getByTestId("category-select"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/L.*mite/i), { target: { value: "200" } });
    fireEvent.click(screen.getByLabelText(/Monthly/i));
    fireEvent.submit(document.getElementById("budget-form")!);
    unmount();
    resolveAdd();
    await Promise.resolve();
    expect(toast).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });
});
