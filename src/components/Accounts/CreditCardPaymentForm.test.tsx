import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import CreditCardPaymentForm from "@/components/Accounts/CreditCardPaymentForm";
import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";
import { movementsStore } from "@/stores/movementsStore";

vi.mock("zustand");
vi.mock("@/stores/accountsStore");
vi.mock("@/stores/currencyStore");
vi.mock("@/stores/movementsStore");
vi.mock("@/components/Forms/SelectAccounts", () => ({
  default: ({ name, onChange }: { name: string; onChange?: (id: number) => void }) => (
    <select
      aria-label="Cuenta origen"
      name={name}
      onChange={(e) => onChange?.(Number(e.target.value))}
    >
      <option value="">Seleccionar cuenta</option>
      <option value="10">Debit Account 1</option>
      <option value="11">Debit Account 2</option>
    </select>
  ),
}));
vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}));

const mockCurrency: Currency = {
  id: 1,
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  conversionRate: 1,
};

const mockAccounts = [
  {
    id: 10,
    name: "Debit Account 1",
    balance: 1000,
    currencyId: 1,
    type: { id: 1, name: "Debit", icon: "card", color: "#000" },
    isActive: true,
  },
  {
    id: 11,
    name: "Debit Account 2",
    balance: 500,
    currencyId: 1,
    type: { id: 1, name: "Debit", icon: "card", color: "#000" },
    isActive: true,
  },
  {
    id: 12,
    name: "Credit Card",
    balance: -200,
    currencyId: 1,
    type: { id: 3, name: "Credit", icon: "credit-card", color: "#000" },
    isActive: true,
    creditInfo: { creditLimit: 2000, cutoffDay: 5, daysToPay: 20 },
  },
];

describe("CreditCardPaymentForm", () => {
  let payCreditCardMock: any;
  let onSuccessMock: any;
  let onCancelMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    payCreditCardMock = vi.fn();
    onSuccessMock = vi.fn();
    onCancelMock = vi.fn();

    vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
      if (store === accountsStore) {
        return selector({
          accounts: mockAccounts,
        });
      }
      return undefined;
    });

    (accountsStore.getState as any).mockReturnValue({
      payCreditCard: payCreditCardMock,
      getById: (id: number) => mockAccounts.find((account) => account.id === id),
    });
    (currencyStore.getState as any).mockReturnValue({
      getById: () => mockCurrency,
    });
    (movementsStore.getState as any).mockReturnValue({
      refresh: vi.fn(),
    });
  });

  it("renders form elements correctly", () => {
    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        installmentIds={[101, 102]}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
      />,
    );

    expect(screen.getByText("Pagar tarjeta")).toBeInTheDocument();
    expect(screen.getByLabelText("Cuenta origen")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toBeInTheDocument();
    expect(screen.getByText("Próximo pago:")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar" })).toBeInTheDocument();
  });

  it("handles adding and removing payment source rows", () => {
    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[]}
      />,
    );

    // Initial state: 1 row, trash icon/delete button is NOT present because there's only 1 row
    expect(screen.queryByLabelText("Eliminar cuenta de origen")).not.toBeInTheDocument();

    // Click "Agregar cuenta"
    fireEvent.click(screen.getByText("Agregar cuenta"));

    // Now there should be 2 rows of account selections and amounts
    const accountSelects = screen.getAllByLabelText("Cuenta origen");
    expect(accountSelects).toHaveLength(2);

    // Delete button should now be visible for the rows
    const deleteButtons = screen.getAllByLabelText("Eliminar cuenta de origen");
    expect(deleteButtons).toHaveLength(2);

    // Click delete on the second row
    fireEvent.click(deleteButtons[1]);

    // Back to 1 row
    expect(screen.getAllByLabelText("Cuenta origen")).toHaveLength(1);
  });

  it("calculates remaining amount and validation state in real-time", () => {
    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[]}
      />,
    );

    const amountInput = screen.getByLabelText("Monto");
    const payButton = screen.getByRole("button", { name: "Pagar" });

    // Underfunded: remaining is 150, button is disabled
    expect(payButton).toBeDisabled();

    // Type 100
    fireEvent.change(amountInput, { target: { value: "100" } });
    expect(payButton).toBeDisabled();

    // Type 150
    fireEvent.change(amountInput, { target: { value: "150" } });
    expect(payButton).toBeEnabled();

    // Type 200 (overfunded, remaining will show 0 because of Math.max(0, ...))
    fireEvent.change(amountInput, { target: { value: "200" } });
    expect(payButton).toBeDisabled();
  });

  it("recalculates the remaining amount and duplicate validation after editing payment rows", async () => {
    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[]}
      />,
    );

    fireEvent.click(screen.getByText("Agregar cuenta"));
    const accounts = screen.getAllByLabelText("Cuenta origen");
    const amounts = screen.getAllByLabelText("Monto");
    fireEvent.change(accounts[0], { target: { value: "10" } });
    fireEvent.change(amounts[0], { target: { value: "100" } });
    fireEvent.change(accounts[1], { target: { value: "11" } });
    fireEvent.change(amounts[1], { target: { value: "50" } });
    expect(screen.getByRole("button", { name: "Pagar" })).toBeEnabled();

    fireEvent.change(amounts[1], { target: { value: "25" } });
    expect(screen.getByRole("button", { name: "Pagar" })).toBeDisabled();

    fireEvent.change(accounts[1], { target: { value: "10" } });
    fireEvent.submit(screen.getByText("Pagar tarjeta").closest("form")!);
    expect(
      await screen.findByText("No puedes seleccionar la misma cuenta dos veces"),
    ).toBeInTheDocument();
  });

  it("displays validation error if account is not selected on submit", async () => {
    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[]}
      />,
    );

    const amountInput = screen.getByLabelText("Monto");
    fireEvent.change(amountInput, { target: { value: "150" } });

    // Try submitting without selecting account
    const form = screen.getByText("Pagar tarjeta").closest("form");
    expect(form).toBeInTheDocument();
    fireEvent.submit(form!);

    expect(
      await screen.findByText("Selecciona una cuenta de origen para cada fila"),
    ).toBeInTheDocument();
    expect(payCreditCardMock).not.toHaveBeenCalled();
  });

  it("displays validation error if duplicate account is selected", async () => {
    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[]}
      />,
    );

    fireEvent.click(screen.getByText("Agregar cuenta"));

    const accountSelects = screen.getAllByLabelText("Cuenta origen");
    const amountInputs = screen.getAllByLabelText("Monto");

    // Select Debit Account 1 (id: 10) in both rows
    fireEvent.change(accountSelects[0], { target: { value: "10" } });
    fireEvent.change(amountInputs[0], { target: { value: "100" } });

    fireEvent.change(accountSelects[1], { target: { value: "10" } });
    fireEvent.change(amountInputs[1], { target: { value: "50" } });

    const form = screen.getByText("Pagar tarjeta").closest("form");
    fireEvent.submit(form!);

    expect(
      await screen.findByText("No puedes seleccionar la misma cuenta dos veces"),
    ).toBeInTheDocument();
    expect(payCreditCardMock).not.toHaveBeenCalled();
  });

  it("calls payCreditCard and onSuccess on valid submission", async () => {
    payCreditCardMock.mockResolvedValue({
      transferMovementIds: [123],
      paidMovementIds: [201, 202],
    });

    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[101, 102]}
      />,
    );

    fireEvent.click(screen.getByText("Agregar cuenta"));

    const accountSelects = screen.getAllByLabelText("Cuenta origen");
    const amountInputs = screen.getAllByLabelText("Monto");

    // Select different debit accounts
    fireEvent.change(accountSelects[0], { target: { value: "10" } });
    fireEvent.change(amountInputs[0], { target: { value: "100" } });

    fireEvent.change(accountSelects[1], { target: { value: "11" } });
    fireEvent.change(amountInputs[1], { target: { value: "50" } });

    const form = screen.getByText("Pagar tarjeta").closest("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(payCreditCardMock).toHaveBeenCalledWith(
        12,
        [
          { fromAccountId: 10, originalAmount: 100, accountAmount: 100 },
          { fromAccountId: 11, originalAmount: 50, accountAmount: 50 },
        ],
        [101, 102],
      );
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });

  it("derives the source debit from the card-currency account amount", async () => {
    const mxnCurrency = { ...mockCurrency, id: 2, code: "MXN", conversionRate: 18 };
    (currencyStore.getState as any).mockReturnValue({
      getById: (id: number) => (id === 1 ? mockCurrency : mxnCurrency),
    });
    const convertedAccounts = mockAccounts.map((account) =>
      account.id === 10 ? { ...account, currencyId: 2 } : account,
    );
    (accountsStore.getState as any).mockReturnValue({
      payCreditCard: payCreditCardMock,
      getById: (id: number) => convertedAccounts.find((account) => account.id === id),
    });
    payCreditCardMock.mockResolvedValue({ transferMovementIds: [123], paidMovementIds: [201] });

    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={10}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[101]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Cuenta origen"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "10" } });
    fireEvent.submit(screen.getByText("Pagar tarjeta").closest("form")!);

    await waitFor(() =>
      expect(payCreditCardMock).toHaveBeenCalledWith(
        12,
        [{ fromAccountId: 10, originalAmount: 180, accountAmount: 10 }],
        [101],
      ),
    );
  });

  it("displays submission error when payCreditCard fails", async () => {
    payCreditCardMock.mockRejectedValue(new Error("Database error"));

    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[]}
      />,
    );

    const accountSelect = screen.getByLabelText("Cuenta origen");
    const amountInput = screen.getByLabelText("Monto");

    fireEvent.change(accountSelect, { target: { value: "10" } });
    fireEvent.change(amountInput, { target: { value: "150" } });

    const form = screen.getByText("Pagar tarjeta").closest("form");
    fireEvent.submit(form!);

    expect(await screen.findByText("Error: Database error")).toBeInTheDocument();
    expect(onSuccessMock).not.toHaveBeenCalled();
  });

  it("locks rapid duplicate submissions and permits retry after rejection", async () => {
    let rejectFirst: (reason: Error) => void = () => undefined;
    payCreditCardMock
      .mockReturnValueOnce(new Promise((_, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce({ transferMovementIds: [123], paidMovementIds: [201] });
    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[101]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Cuenta origen"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "150" } });
    const form = screen.getByText("Pagar tarjeta").closest("form")!;

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(payCreditCardMock).toHaveBeenCalledTimes(1);
    rejectFirst(new Error("temporary failure"));
    expect(await screen.findByText("Error: temporary failure")).toBeInTheDocument();

    fireEvent.submit(form);
    await waitFor(() => expect(payCreditCardMock).toHaveBeenCalledTimes(2));
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancelar button is clicked", () => {
    render(
      <CreditCardPaymentForm
        creditAccountId={12}
        totalAmount={150}
        currency={mockCurrency}
        onSuccess={onSuccessMock}
        onCancel={onCancelMock}
        installmentIds={[]}
      />,
    );

    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancelMock).toHaveBeenCalled();
  });
});
