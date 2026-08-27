import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeModal, toast } from "webcoreui";
import { useStore } from "zustand";

import AccountForm from "@/components/Accounts/Form";
import { createAccountFromData, validateAccountForm as validate } from "@/lib/forms/account";
import { logger } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
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
}));

vi.mock("@/lib/forms/account", () => ({
  validateAccountForm: vi.fn(),
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

    mockAdd.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);

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

  it("should create account when form is valid", async () => {
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

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith("#account-created");
      expect(closeModal).toHaveBeenCalledWith(`#${MODAL_ID.ACCOUNT.CREATE}`);
    });
  });

  it("should update account when editing", async () => {
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

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith("#account-updated");
    });
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

  it("should clear credit-only fields from the submitted payload when switching to cash", () => {
    vi.mocked(validate).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(createAccountFromData).mockReturnValue({ name: "Cash" } as any);

    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);
    fireEvent.click(screen.getByLabelText(/Credit/i));
    fireEvent.change(screen.getByLabelText(/L.*mite de Cr.*dito/i), {
      target: { value: "2000" },
    });
    fireEvent.click(screen.getByLabelText(/Cash/i));
    fireEvent.submit(document.getElementById("account-form")!);

    const submittedData = vi.mocked(validate).mock.calls[0][0] as Record<
      string,
      FormDataEntryValue
    >;
    expect(submittedData.creditLimit).toBeUndefined();
    expect(submittedData.cutoffDay).toBeUndefined();
    expect(submittedData.daysToPay).toBeUndefined();
  });

  it("locks duplicate submissions, preserves values on failure, and permits retry", async () => {
    let rejectFirst: (reason: Error) => void = () => undefined;
    mockAdd
      .mockReturnValueOnce(new Promise((_, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce(undefined);
    vi.mocked(validate).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(createAccountFromData).mockReturnValue({ name: "Checking" } as Account);

    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Checking" } });
    fireEvent.click(screen.getByLabelText(/Cash/i));
    const form = document.getElementById("account-form")!;

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();

    rejectFirst(new Error("temporary"));
    expect(await screen.findByText("Ocurrió un error al guardar la cuenta")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Checking");
    fireEvent.submit(form);

    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(2));
    expect(toast).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it("clears validation errors on reset", () => {
    vi.mocked(validate).mockReturnValue({ valid: false, errors: ["Invalid account"] });
    render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);
    fireEvent.submit(document.getElementById("account-form")!);
    expect(screen.getByText("Invalid account")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    expect(screen.queryByText("Invalid account")).not.toBeInTheDocument();
  });

  it("suppresses completion UI effects after unmount", async () => {
    let resolveAdd: () => void = () => undefined;
    mockAdd.mockReturnValueOnce(new Promise<void>((resolve) => (resolveAdd = resolve)));
    vi.mocked(validate).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(createAccountFromData).mockReturnValue({ name: "Checking" } as Account);
    const { unmount } = render(<AccountForm modalId={MODAL_ID.ACCOUNT.CREATE} />);
    fireEvent.click(screen.getByLabelText(/Cash/i));
    fireEvent.submit(document.getElementById("account-form")!);
    unmount();
    resolveAdd();
    await Promise.resolve();
    expect(toast).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });
});
