import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeModal, toast } from "webcoreui";
import { useStore } from "zustand";

import MovementForm from "@/components/Movements/MovementForm";
import { logger } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { editStore } from "@/stores/editStore";
import { createMovementFromData, validateMovement } from "@/stores/movementsStore";
import { ACCOUNT_TYPES, EDIT_TYPES, MODAL_ID, MOVEMENT_TYPES } from "@/types/enums";

vi.mock("@/stores/budgetStore", () => ({
  budgetStore: {
    getState: () => ({
      refreshAffected: vi.fn().mockResolvedValue(undefined),
    }),
    subscribe: vi.fn(),
  },
}));

vi.mock("@/components/Forms/SelectCurrencies", () => ({
  default: () => (
    <select name="currency" data-testid="currency-select">
      <option value="1">MXN</option>
    </select>
  ),
}));

vi.mock("@/components/Forms/SelectAccounts", () => ({
  default: ({ name, label, accountId, onChange }: any) => (
    <fieldset>
      <label htmlFor={name}>{label}</label>
      <select
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
            isActive: true,
          };
        }
        return {
          id: 1,
          name: "Cash Account",
          type: { id: ACCOUNT_TYPES.CASH },
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
    isActive: true,
  },
  {
    id: 2,
    name: "Credit Account",
    type: { id: ACCOUNT_TYPES.CREDIT },
    isActive: true,
  },
];

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

    return undefined;
  });
};

describe("MovementForm", () => {
  beforeEach(() => {
    logger.debug("MovementForm test beforeEach: clear mocks and setup store state");
    vi.clearAllMocks();

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

      const form = document.getElementById("income-form");

      fireEvent.submit(form!);

      expect(screen.getByText("El monto debe ser un número mayor a 0")).toBeInTheDocument();
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it("should create income when form is valid", () => {
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

      const form = document.getElementById("income-form");

      fireEvent.submit(form!);

      expect(createMovementFromData).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledWith(createdMovement);
      expect(toast).toHaveBeenCalledWith("#income-created");
      expect(closeModal).toHaveBeenCalledWith(`#${MODAL_ID.MOVEMENT.INCOME.CREATE}`);
    });

    it("should update income when editing", () => {
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

      const form = document.getElementById("income-form");

      fireEvent.submit(form!);

      expect(mockUpdate).toHaveBeenCalledWith(1, updatedMovement);
      expect(toast).toHaveBeenCalledWith("#income-updated");
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

      expect(screen.getByDisplayValue("150")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Old Movement")).toBeInTheDocument();
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

    it("should create expense when form is valid", () => {
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

      const form = document.getElementById("expense-form");

      fireEvent.submit(form!);

      expect(createMovementFromData).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledWith(createdMovement);
      expect(toast).toHaveBeenCalledWith("#expense-created");
      expect(closeModal).toHaveBeenCalledWith(`#${MODAL_ID.MOVEMENT.EXPENSE.CREATE}`);
    });

    it("should update expense when editing", () => {
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

      const form = document.getElementById("expense-form");

      fireEvent.submit(form!);

      expect(mockUpdate).toHaveBeenCalledWith(1, updatedMovement);
      expect(toast).toHaveBeenCalledWith("#expense-updated");
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

    it("should create transfer when form is valid", () => {
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

      const form = document.getElementById("transfer-form");

      fireEvent.submit(form!);

      expect(createMovementFromData).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledWith(createdMovement);
      expect(toast).toHaveBeenCalledWith("#transfer-created");
      expect(closeModal).toHaveBeenCalledWith(`#${MODAL_ID.MOVEMENT.TRANSFER.CREATE}`);
    });

    it("should update transfer when editing", () => {
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

      const form = document.getElementById("transfer-form");

      fireEvent.submit(form!);

      expect(mockUpdate).toHaveBeenCalledWith(1, updatedMovement);
      expect(toast).toHaveBeenCalledWith("#transfer-updated");
    });
  });

  it("should call updateBalance after creating a movement", () => {
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

    const form = document.getElementById("transfer-form");

    fireEvent.submit(form!);

    expect(mockUpdateBalance).toHaveBeenCalledWith(1, 2);
  });

  it("should render reset button", () => {
    render(
      <MovementForm
        modalId={MODAL_ID.MOVEMENT.INCOME.CREATE}
        movementType={MOVEMENT_TYPES.INCOME}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Restaurar",
      }),
    ).toBeInTheDocument();
  });

  it("should render submit button", () => {
    render(
      <MovementForm
        modalId={MODAL_ID.MOVEMENT.INCOME.CREATE}
        movementType={MOVEMENT_TYPES.INCOME}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Guardar",
      }),
    ).toBeInTheDocument();
  });
});
