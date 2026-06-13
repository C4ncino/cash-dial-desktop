import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeModal, toast } from "webcoreui";
import { useStore } from "zustand";

import AccountForm from "@/components/Accounts/Form";
import { logger } from "@/lib/logger";
import { accountsStore, createAccountFromData, validate } from "@/stores/accountsStore";
import { editStore } from "@/stores/editStore";
import { ACCOUNT_TYPES, EDIT_TYPES, MODAL_ID } from "@/types/enums";

vi.mock("@iconify/react", () => ({
  Icon: () => <span data-testid="icon" />,
}));

vi.mock("@/components/Forms/SelectCurrencies", () => ({
  default: () => (
    <select name="currencyId" data-testid="currency-select">
      <option value="1">USD</option>
    </select>
  ),
}));

const mockAdd = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/stores/accountsStore", () => ({
  accountsStore: {
    getState: () => ({
      getById: (id: number) => ({
        id,
        name: "Old Account",
        balance: 100,
        currencyId: 1,
        type: {
          id: ACCOUNT_TYPES.CASH,
        },
      }),
      add: mockAdd,
      update: mockUpdate,
    }),
    subscribe: vi.fn(),
  },
  validate: vi.fn(),
  createAccountFromData: vi.fn(),
}));

const mockTypes = [
  {
    id: ACCOUNT_TYPES.CASH,
    name: "Cash",
    icon: "wallet",
  },
  {
    id: ACCOUNT_TYPES.CREDIT,
    name: "Credit",
    icon: "credit-card",
  },
];

const mockUseStoreState = ({ types = mockTypes, editState = {} }: any = {}) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === accountsStore) {
      return selector({
        types,
      });
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

describe("AccountForm", () => {
  beforeEach(() => {
    logger.debug("AccountForm test beforeEach: clear mocks and setup store state");
    vi.clearAllMocks();

    mockUseStoreState();
  });

  it("should render form fields", () => {
    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText(/Saldo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("should render account type options", () => {
    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);

    expect(screen.getByLabelText(/Cash/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Credit/i)).toBeInTheDocument();
  });

  it("should not show credit fields initially", () => {
    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);

    expect(screen.queryByLabelText("Límite de Crédito")).not.toBeInTheDocument();
  });

  it("should show credit fields when credit type is selected", () => {
    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);

    fireEvent.click(screen.getByLabelText(/Credit/i));

    expect(screen.getByLabelText("Límite de Crédito")).toBeInTheDocument();

    expect(screen.getByLabelText("Día de Corte")).toBeInTheDocument();

    expect(screen.getByLabelText("Días para pagar")).toBeInTheDocument();
  });

  it("should display validation errors", () => {
    vi.mocked(validate).mockReturnValue({
      valid: false,
      errors: ["Name is required"],
    });

    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);

    const form = document.getElementById("account-form");

    fireEvent.submit(form!);

    expect(screen.getByText("Name is required")).toBeInTheDocument();

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("should create account when form is valid", () => {
    vi.mocked(validate).mockReturnValue({
      valid: true,
      errors: [],
    });

    const createdAccount = {
      name: "Checking",
    };

    vi.mocked(createAccountFromData).mockReturnValue(createdAccount as any);

    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: {
        value: "Checking",
      },
    });

    fireEvent.click(screen.getByLabelText(/Cash/i));

    const form = document.getElementById("account-form");

    fireEvent.submit(form!);

    expect(createAccountFromData).toHaveBeenCalled();
    expect(mockAdd).toHaveBeenCalledWith(createdAccount);
    expect(toast).toHaveBeenCalledWith("#account-created");
    expect(closeModal).toHaveBeenCalledWith(`#${MODAL_ID.ACCOUNT.CREATE}`);
  });

  it("should update account when editing", () => {
    mockUseStoreState({
      editState: {
        id: 1,
        type: EDIT_TYPES.ACCOUNT,
      },
    });

    vi.mocked(validate).mockReturnValue({
      valid: true,
      errors: [],
    });

    const updatedAccount = {
      name: "Updated Account",
    };

    vi.mocked(createAccountFromData).mockReturnValue(updatedAccount as any);

    render(<AccountForm modalId={MODAL_ID.ACCOUNT.EDIT} />);

    const form = document.getElementById("account-form");

    fireEvent.submit(form!);

    expect(mockUpdate).toHaveBeenCalledWith(1, updatedAccount);
    expect(toast).toHaveBeenCalledWith("#account-updated");
  });

  it("should populate fields when editing an account", () => {
    mockUseStoreState({
      editState: {
        id: 1,
        type: EDIT_TYPES.ACCOUNT,
      },
    });

    render(<AccountForm modalId={MODAL_ID.ACCOUNT.EDIT} />);

    expect(screen.getByDisplayValue("Old Account")).toBeInTheDocument();

    expect(screen.getByDisplayValue("100")).toBeInTheDocument();
  });

  it("should render reset button", () => {
    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);

    expect(
      screen.getByRole("button", {
        name: "Restaurar",
      }),
    ).toBeInTheDocument();
  });

  it("should render submit button", () => {
    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);

    expect(
      screen.getByRole("button", {
        name: "Guardar",
      }),
    ).toBeInTheDocument();
  });
});
