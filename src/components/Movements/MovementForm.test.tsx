import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeModal, toast } from "webcoreui";
import { useStore } from "zustand";

import MovementForm from "@/components/Movements/MovementForm";
import { createMovementFromData, validateMovement } from "@/lib/forms/movement";
import { logger } from "@/lib/logger";
import { MOVEMENT_CREATE_REQUEST } from "@/lib/movementCreation";
import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";
import { editStore } from "@/stores/editStore";
import { planningsStore } from "@/stores/planningsStore";
import { ACCOUNT_TYPES, EDIT_TYPES, MODAL_ID, MOVEMENT_TYPES } from "@/types/enums";

function getMovementForm(id: string) {
  const form = document.getElementById(id);
  if (!(form instanceof HTMLFormElement)) throw new Error(`Movement form ${id} was not rendered`);
  return form;
}

vi.mock("@/stores/budgetStore", () => ({
  budgetStore: {
    getState: () => ({
      refreshAffected: vi.fn().mockResolvedValue(undefined),
    }),
    subscribe: vi.fn(),
  },
}));

vi.mock("@/components/Forms/SelectCurrency", () => ({
  default: ({ value, onChange, disabled }: any) => (
    <select
      name="currency"
      data-testid="currency-select"
      value={value ?? ""}
      onChange={onChange}
      disabled={disabled}
    >
      <option value="1">MXN</option>
      <option value="2">USD</option>
    </select>
  ),
}));

vi.mock("@/components/Forms/SelectAccounts", () => ({
  default: ({ name, label, accountId, onChange }: any) => (
    <fieldset>
      <label htmlFor={name}>{label}</label>
      <select
        key={accountId}
        name={name}
        id={name}
        data-testid={`select-${name}`}
        defaultValue={accountId}
        onChange={(e: any) => onChange?.(Number(e.target.value))}
      >
        <option value="">Seleccionar cuenta</option>
        <option value="1">Cash Account</option>
        <option value="2">Credit Account</option>
      </select>
    </fieldset>
  ),
}));

vi.mock("@/components/Forms/SelectCategories", () => ({
  default: ({ categoryId }: any) => (
    <fieldset>
      <label htmlFor="categoryId">Categoría</label>
      <select
        name="categoryId"
        id="categoryId"
        data-testid="category-select"
        defaultValue={categoryId}
      >
        <option value="">Seleccionar</option>
        <option value="1">Food</option>
        <option value="2">Transport</option>
      </select>
    </fieldset>
  ),
}));

const mockAdd = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateBalance = vi.fn();

vi.mock("@/stores/movementsStore", () => ({
  movementsStore: {
    getState: () => ({
      getById: (id: number) => ({
        id,
        typeId: MOVEMENT_TYPES.EXPENSE,
        accountId: 1,
        categoryId: 1,
        currencyId: 1,
        originalAmount: 150,
        accountAmount: 150,
        timestamp: new Date("2025-06-15T10:30").getTime(),
        description: "Old Movement",
      }),
      add: mockAdd,
      update: mockUpdate,
    }),
    subscribe: vi.fn(),
  },
}));

vi.mock("@/lib/forms/movement", () => ({
  validateMovement: vi.fn(),
  createMovementFromData: vi.fn(),
}));

vi.mock("@/stores/accountsStore", () => ({
  accountsStore: {
    getState: () => ({
      getById: (id: number) => {
        if (id === 2) {
          return {
            id: 2,
            name: "Credit Account",
            type: { id: ACCOUNT_TYPES.CREDIT },
            currencyId: 2,
            isActive: true,
          };
        }
        return {
          id: 1,
          name: "Cash Account",
          type: { id: ACCOUNT_TYPES.CASH },
          currencyId: 1,
          isActive: true,
        };
      },
      updateBalance: mockUpdateBalance,
    }),
    subscribe: vi.fn(),
  },
}));

const mockAccounts = [
  {
    id: 1,
    name: "Cash Account",
    type: { id: ACCOUNT_TYPES.CASH },
    currencyId: 1,
    isActive: true,
  },
  {
    id: 2,
    name: "Credit Account",
    type: { id: ACCOUNT_TYPES.CREDIT },
    currencyId: 2,
    isActive: true,
  },
];

const mockPlanning = {
  id: 7,
  typeId: MOVEMENT_TYPES.EXPENSE,
  accountId: 1,
  categoryId: 1,
  currencyId: 1,
  name: "Rent",
  amount: 1200,
  recurringRule: { isActive: true },
  currentOccurrence: { statusId: 1, expectedDate: Date.now() },
};

const mockUseStoreState = ({ accounts = mockAccounts, editState = {} }: any = {}) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === accountsStore) {
      return selector({ accounts });
    }

    if (store === editStore) {
      return selector({
        clear: vi.fn(),
        ...editState,
      });
    }

    if (store === planningsStore) {
      return selector({ plannings: [mockPlanning] });
    }

    if (store === currencyStore) {
      return selector({
        currencies: [
          { id: 1, code: "MXN", conversionRate: 20 },
          { id: 2, code: "USD", conversionRate: 1 },
        ],
      });
    }

    return undefined;
  });

  /* it("submits planningId and applies the selected planning context", () => {
    vi.mocked(validateMovement).mockReturnValue({ valid: true, errors: [] });
    const createdMovement = { accountId: 1, originalAmount: 1200, planningId: 7 };
    vi.mocked(createMovementFromData).mockReturnValue(createdMovement as any);

    render(
      <MovementForm
        modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
        movementType={MOVEMENT_TYPES.EXPENSE}
      />,
    );

    fireEvent.change(screen.getByLabelText("Planificación (opcional)"), {
      target: { value: "7" },
    });
    fireEvent.submit(getMovementForm("expense-form"));

    expect(createMovementFromData.mock.calls[0][0]).toMatchObject({ planningId: "7" });
    expect(mockAdd).toHaveBeenCalledWith(createdMovement);
  }); */
};

it("submits planningId and applies the selected planning context", () => {
  vi.mocked(validateMovement).mockReturnValue({ valid: true, errors: [] });
  const createdMovement = { accountId: 1, originalAmount: 1200, planningId: 7 };
  vi.mocked(createMovementFromData).mockReturnValue(createdMovement as any);
  mockUseStoreState();
  render(
    <MovementForm
      modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
      movementType={MOVEMENT_TYPES.EXPENSE}
    />,
  );
  fireEvent.change(screen.getByLabelText(/Planificaci.*opcional/), {
    target: { value: "7" },
  });
  fireEvent.submit(getMovementForm("expense-form"));
  expect(vi.mocked(createMovementFromData).mock.calls[0][0]).toMatchObject({
    planningId: "7",
  });
  expect(mockAdd).toHaveBeenCalledWith(createdMovement);
});

it("populates the amount when completing a planning occurrence", async () => {
  mockUseStoreState();
  render(
    <MovementForm
      modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
      movementType={MOVEMENT_TYPES.EXPENSE}
    />,
  );

  fireEvent(
    window,
    new CustomEvent("planning:movement-create", {
      detail: { planningId: mockPlanning.id, amount: mockPlanning.amount },
    }),
  );

  await waitFor(() => expect(screen.getByLabelText("Monto")).toHaveValue(1200));
  expect(screen.getByLabelText("Monto")).toHaveAttribute("value", "1200");
});

it("prefills and clears the account from matching creation requests", async () => {
  mockUseStoreState();
  render(
    <MovementForm
      modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
      movementType={MOVEMENT_TYPES.EXPENSE}
    />,
  );

  fireEvent(
    window,
    new CustomEvent(MOVEMENT_CREATE_REQUEST, {
      detail: { typeId: MOVEMENT_TYPES.EXPENSE, accountId: 2 },
    }),
  );
  await waitFor(() => expect(screen.getByTestId("select-accountId")).toHaveValue("2"));

  fireEvent(
    window,
    new CustomEvent(MOVEMENT_CREATE_REQUEST, {
      detail: { typeId: MOVEMENT_TYPES.EXPENSE },
    }),
  );
  await waitFor(() => expect(screen.getByTestId("select-accountId")).toHaveValue(""));
});

it("ignores account prefill requests for another movement type or an edit form", () => {
  mockUseStoreState({ editState: { id: 1, type: EDIT_TYPES.EXPENSE } });
  render(
    <MovementForm
      modalId={MODAL_ID.MOVEMENT.EXPENSE.EDIT}
      movementType={MOVEMENT_TYPES.EXPENSE}
    />,
  );

  fireEvent(
    window,
    new CustomEvent(MOVEMENT_CREATE_REQUEST, {
      detail: { typeId: MOVEMENT_TYPES.INCOME, accountId: 2 },
    }),
  );
  fireEvent(
    window,
    new CustomEvent(MOVEMENT_CREATE_REQUEST, {
      detail: { typeId: MOVEMENT_TYPES.EXPENSE, accountId: 2 },
    }),
  );

  expect(screen.getByTestId("select-accountId")).toHaveValue("1");
});

it("shows backend planning compatibility errors in the form", async () => {
  vi.mocked(validateMovement).mockReturnValue({ valid: true, errors: [] });
  vi.mocked(createMovementFromData).mockReturnValue({ planningId: 7 } as any);
  mockAdd.mockRejectedValueOnce(new Error("planning compatibility error"));
  mockUseStoreState();
  render(
    <MovementForm
      modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
      movementType={MOVEMENT_TYPES.EXPENSE}
    />,
  );
  fireEvent.submit(getMovementForm("expense-form"));
  await waitFor(() => expect(screen.getByText("planning compatibility error")).toBeInTheDocument());
});

it("supports ECB conversion and manual account amount overrides", async () => {
  mockUseStoreState();
  render(
    <MovementForm
      modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
      movementType={MOVEMENT_TYPES.EXPENSE}
    />,
  );

  fireEvent.change(screen.getByTestId("select-accountId"), {
    target: { value: "2" },
  });

  const originalAmount = screen.getByLabelText("Monto");
  fireEvent.change(originalAmount, { target: { value: "100" } });

  const accountAmount = await screen.findByLabelText("Monto en USD");
  await waitFor(() => expect(accountAmount).toHaveValue(5));

  fireEvent.change(accountAmount, { target: { value: "5.25" } });
  expect(accountAmount).toHaveValue(5.25);

  fireEvent.click(screen.getByRole("button", { name: "Auto Completar" }));
  await waitFor(() => expect(accountAmount).toHaveValue(5));
});

describe("MovementForm", () => {
  beforeEach(() => {
    logger.debug("MovementForm test beforeEach: clear mocks and setup store state");
    vi.clearAllMocks();
    mockAdd.mockResolvedValue({ id: 99 });
    mockUpdate.mockResolvedValue(undefined);
    mockUpdateBalance.mockResolvedValue(0);

    mockUseStoreState();
  });

  describe("Income form", () => {
    it("should render form fields", () => {
      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.INCOME.CREATE}
          movementType={MOVEMENT_TYPES.INCOME}
        />,
      );

      expect(screen.getByLabelText("Monto")).toBeInTheDocument();
      expect(screen.getByLabelText("Cuenta Destino")).toBeInTheDocument();
      expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
      expect(screen.getByLabelText("Hora")).toBeInTheDocument();
      expect(screen.getByLabelText("Descripción (opcional)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();

      expect(document.getElementById("income-form")).toHaveClass(
        "w-full",
        "mx-auto",
        "p-4",
        "max-w-lg",
        "space-y-4",
      );
    });

    it("should render category select for income", () => {
      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.INCOME.CREATE}
          movementType={MOVEMENT_TYPES.INCOME}
        />,
      );

      expect(screen.getByLabelText("Categoría")).toBeInTheDocument();
    });

    it("should display validation errors", () => {
      vi.mocked(validateMovement).mockReturnValue({
        valid: false,
        errors: ["El monto debe ser un número mayor a 0"],
      });

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.INCOME.CREATE}
          movementType={MOVEMENT_TYPES.INCOME}
        />,
      );

      const form = getMovementForm("income-form");

      fireEvent.submit(form);

      expect(screen.getByText("El monto debe ser un número mayor a 0")).toBeInTheDocument();
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it("should create income when form is valid", async () => {
      vi.mocked(validateMovement).mockReturnValue({
        valid: true,
        errors: [],
      });

      const createdMovement = {
        accountId: 1,
        originalAmount: 500,
      };

      vi.mocked(createMovementFromData).mockReturnValue(createdMovement as any);

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.INCOME.CREATE}
          movementType={MOVEMENT_TYPES.INCOME}
        />,
      );

      fireEvent.change(screen.getByLabelText("Monto"), {
        target: { value: "500" },
      });

      const form = getMovementForm("income-form");

      fireEvent.submit(form);

      expect(createMovementFromData).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledWith(createdMovement);
      await waitFor(() => expect(toast).toHaveBeenCalledWith("#income-created"));
      expect(closeModal).toHaveBeenCalledWith(`#${MODAL_ID.MOVEMENT.INCOME.CREATE}`);
    });

    it("creates from the create modal even when edit state is stale", async () => {
      mockUseStoreState({ editState: { id: 1, type: EDIT_TYPES.INCOME } });
      vi.mocked(validateMovement).mockReturnValue({ valid: true, errors: [] });
      const createdMovement = {
        accountId: 1,
        categoryId: 1,
        originalAmount: 50,
        accountAmount: 50,
      } as Movement;
      vi.mocked(createMovementFromData).mockReturnValue(createdMovement);

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.INCOME.CREATE}
          movementType={MOVEMENT_TYPES.INCOME}
        />,
      );
      fireEvent.submit(getMovementForm("income-form"));

      await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(createdMovement));
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith("#income-created");
    });

    it("should update income when editing", async () => {
      mockUseStoreState({
        editState: {
          id: 1,
          type: EDIT_TYPES.INCOME,
        },
      });

      vi.mocked(validateMovement).mockReturnValue({
        valid: true,
        errors: [],
      });

      const updatedMovement = {
        accountId: 1,
        originalAmount: 600,
      };

      vi.mocked(createMovementFromData).mockReturnValue(updatedMovement as any);

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.INCOME.EDIT}
          movementType={MOVEMENT_TYPES.INCOME}
        />,
      );

      const form = getMovementForm("income-form");

      fireEvent.submit(form);

      expect(mockUpdate).toHaveBeenCalledWith(1, updatedMovement);
      await waitFor(() => expect(toast).toHaveBeenCalledWith("#income-updated"));
    });

    it("should populate fields when editing an income", () => {
      mockUseStoreState({
        editState: {
          id: 1,
          type: EDIT_TYPES.INCOME,
        },
      });

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.INCOME.EDIT}
          movementType={MOVEMENT_TYPES.INCOME}
        />,
      );

      expect(screen.getByLabelText("Monto")).toHaveValue(150);
      expect(screen.getByDisplayValue("Old Movement")).toBeInTheDocument();
    });

    it("restores the selected movement amount instead of the create default", () => {
      mockUseStoreState({
        editState: {
          id: 1,
          type: EDIT_TYPES.INCOME,
        },
      });

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.INCOME.EDIT}
          movementType={MOVEMENT_TYPES.INCOME}
        />,
      );

      const amount = screen.getByLabelText("Monto");
      fireEvent.change(amount, { target: { value: "999" } });
      expect(amount).toHaveValue(999);

      fireEvent.reset(getMovementForm("income-form"));
      expect(amount).toHaveValue(150);
    });
  });

  describe("Expense form", () => {
    it("should render form fields with Cuenta Origen label", () => {
      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
          movementType={MOVEMENT_TYPES.EXPENSE}
        />,
      );

      expect(screen.getByLabelText("Monto")).toBeInTheDocument();
      expect(screen.getByLabelText("Cuenta Origen")).toBeInTheDocument();
      expect(screen.getByLabelText("Categoría")).toBeInTheDocument();
    });

    it("should not show installments field initially", () => {
      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
          movementType={MOVEMENT_TYPES.EXPENSE}
        />,
      );

      expect(screen.queryByLabelText("Mensualidades (opcional)")).not.toBeInTheDocument();
    });

    it("should show installments field when a credit account is selected", () => {
      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
          movementType={MOVEMENT_TYPES.EXPENSE}
        />,
      );

      fireEvent.change(screen.getByTestId("select-accountId"), {
        target: { value: "2" },
      });

      expect(screen.getByLabelText("Mensualidades (opcional)")).toBeInTheDocument();
    });

    it("should create expense when form is valid", async () => {
      vi.mocked(validateMovement).mockReturnValue({
        valid: true,
        errors: [],
      });

      const createdMovement = {
        accountId: 1,
        originalAmount: 200,
      };

      vi.mocked(createMovementFromData).mockReturnValue(createdMovement as any);

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.EXPENSE.CREATE}
          movementType={MOVEMENT_TYPES.EXPENSE}
        />,
      );

      const form = getMovementForm("expense-form");

      fireEvent.submit(form);

      expect(createMovementFromData).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledWith(createdMovement);
      await waitFor(() => expect(toast).toHaveBeenCalledWith("#expense-created"));
      expect(closeModal).toHaveBeenCalledWith(`#${MODAL_ID.MOVEMENT.EXPENSE.CREATE}`);
    });

    it("should update expense when editing", async () => {
      mockUseStoreState({
        editState: {
          id: 1,
          type: EDIT_TYPES.EXPENSE,
        },
      });

      vi.mocked(validateMovement).mockReturnValue({
        valid: true,
        errors: [],
      });

      const updatedMovement = {
        accountId: 1,
        originalAmount: 300,
      };

      vi.mocked(createMovementFromData).mockReturnValue(updatedMovement as any);

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.EXPENSE.EDIT}
          movementType={MOVEMENT_TYPES.EXPENSE}
        />,
      );

      const form = getMovementForm("expense-form");

      fireEvent.submit(form);

      expect(mockUpdate).toHaveBeenCalledWith(1, updatedMovement);
      await waitFor(() => expect(toast).toHaveBeenCalledWith("#expense-updated"));
    });
  });

  describe("Transfer form", () => {
    it("should render both account selects", () => {
      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.TRANSFER.CREATE}
          movementType={MOVEMENT_TYPES.TRANSFER}
        />,
      );

      expect(screen.getByLabelText("Cuenta Origen")).toBeInTheDocument();
      expect(screen.getByLabelText("Cuenta Destino")).toBeInTheDocument();
    });

    it("should not render category select for transfers", () => {
      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.TRANSFER.CREATE}
          movementType={MOVEMENT_TYPES.TRANSFER}
        />,
      );

      expect(screen.queryByLabelText("Categoría")).not.toBeInTheDocument();
    });

    it("uses the origin account currency for the transfer amount", () => {
      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.TRANSFER.CREATE}
          movementType={MOVEMENT_TYPES.TRANSFER}
        />,
      );

      fireEvent.change(screen.getByTestId("select-accountId"), {
        target: { value: "1" },
      });
      fireEvent.change(screen.getByTestId("select-toAccountId"), {
        target: { value: "2" },
      });

      expect(screen.getByTestId("currency-select")).toHaveValue("1");
      expect(screen.getByLabelText("Monto en USD")).toBeInTheDocument();
    });

    it("should create transfer when form is valid", async () => {
      vi.mocked(validateMovement).mockReturnValue({
        valid: true,
        errors: [],
      });

      const createdMovement = {
        accountId: 1,
        toAccountId: 2,
        originalAmount: 100,
      };

      vi.mocked(createMovementFromData).mockReturnValue(createdMovement as any);

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.TRANSFER.CREATE}
          movementType={MOVEMENT_TYPES.TRANSFER}
        />,
      );

      const form = getMovementForm("transfer-form");

      fireEvent.submit(form);

      expect(createMovementFromData).toHaveBeenCalled();
      expect(vi.mocked(createMovementFromData).mock.calls[0][0]).toMatchObject({
        currency: "1",
      });
      expect(mockAdd).toHaveBeenCalledWith(createdMovement);
      await waitFor(() => expect(toast).toHaveBeenCalledWith("#transfer-created"));
      expect(closeModal).toHaveBeenCalledWith(`#${MODAL_ID.MOVEMENT.TRANSFER.CREATE}`);
    });

    it("should update transfer when editing", async () => {
      mockUseStoreState({
        editState: {
          id: 1,
          type: EDIT_TYPES.TRANSFER,
        },
      });

      vi.mocked(validateMovement).mockReturnValue({
        valid: true,
        errors: [],
      });

      const updatedMovement = {
        accountId: 1,
        toAccountId: 2,
        originalAmount: 250,
      };

      vi.mocked(createMovementFromData).mockReturnValue(updatedMovement as any);

      render(
        <MovementForm
          modalId={MODAL_ID.MOVEMENT.TRANSFER.EDIT}
          movementType={MOVEMENT_TYPES.TRANSFER}
        />,
      );

      const form = getMovementForm("transfer-form");

      fireEvent.submit(form);

      expect(mockUpdate).toHaveBeenCalledWith(1, updatedMovement);
      await waitFor(() => expect(toast).toHaveBeenCalledWith("#transfer-updated"));
    });
  });

  it("should call updateBalance after creating a movement", async () => {
    vi.mocked(validateMovement).mockReturnValue({
      valid: true,
      errors: [],
    });

    const createdMovement = {
      accountId: 1,
      toAccountId: 2,
      originalAmount: 100,
    };

    vi.mocked(createMovementFromData).mockReturnValue(createdMovement as any);

    render(
      <MovementForm
        modalId={MODAL_ID.MOVEMENT.TRANSFER.CREATE}
        movementType={MOVEMENT_TYPES.TRANSFER}
      />,
    );

    const form = getMovementForm("transfer-form");

    fireEvent.submit(form);

    await waitFor(() => expect(mockUpdateBalance).toHaveBeenCalledWith(1, 2));
  });

  it("locks duplicate submissions, preserves data on failure, and allows retry", async () => {
    let rejectFirst: (reason: Error) => void = () => undefined;
    mockAdd
      .mockReturnValueOnce(new Promise((_, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce({ id: 99 });
    vi.mocked(validateMovement).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(createMovementFromData).mockReturnValue({
      accountId: 1,
      categoryId: 1,
      originalAmount: 100,
      accountAmount: 100,
    } as Movement);
    render(
      <MovementForm
        modalId={MODAL_ID.MOVEMENT.INCOME.CREATE}
        movementType={MOVEMENT_TYPES.INCOME}
      />,
    );
    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "100" } });
    const form = getMovementForm("income-form");

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    rejectFirst(new Error("temporary movement failure"));
    expect(await screen.findByText("temporary movement failure")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toHaveValue(100);

    fireEvent.submit(form);
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(2));
    expect(toast).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it("suppresses completion UI after unmount", async () => {
    let resolveAdd: (movement: Movement) => void = () => undefined;
    mockAdd.mockReturnValueOnce(new Promise((resolve) => (resolveAdd = resolve)));
    vi.mocked(validateMovement).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(createMovementFromData).mockReturnValue({
      accountId: 1,
      categoryId: 1,
      originalAmount: 100,
      accountAmount: 100,
    } as Movement);
    const { unmount } = render(
      <MovementForm
        modalId={MODAL_ID.MOVEMENT.INCOME.CREATE}
        movementType={MOVEMENT_TYPES.INCOME}
      />,
    );
    fireEvent.submit(getMovementForm("income-form"));
    unmount();
    resolveAdd({ id: 99 } as Movement);
    await Promise.resolve();
    expect(toast).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });
});
