import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccountNextPayment from "@/components/Accounts/AccountNextPayment";
import { useStore } from "zustand";
import { accountsStore } from "@/stores/accountsStore";
import { currencyStore } from "@/stores/currencyStore";
import { movementsStore } from "@/stores/movementsStore";
import { formatAmount } from "@/lib/formatters";

vi.mock("zustand");
vi.mock("@/stores/accountsStore");
vi.mock("@/stores/currencyStore");
vi.mock("@/stores/movementsStore");
vi.mock("@/hooks/useDate", () => ({
  default: () => ({ dateShort: "15/08/2026", time: "12:00" }),
}));
vi.mock("@/components/Accounts/CreditCardPaymentForm", () => ({
  default: ({ creditAccountId, totalAmount, onSuccess, onCancel }: any) => (
    <div data-testid="mock-payment-form">
      <span>
        Pagar tarjeta - {creditAccountId} - {totalAmount}
      </span>
      <button onClick={onSuccess}>Simulate Success</button>
      <button onClick={onCancel}>Simulate Cancel</button>
    </div>
  ),
}));

describe("AccountNextPayment", () => {
  const mockCurrency = {
    id: 1,
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    conversionRate: 1,
  };

  const mockAccount = {
    id: 1,
    currencyId: 1,
  };

  const mockNextPayment = {
    accountId: 1,
    paymentDate: 1723700000,
    totalAmount: 150.5,
    movements: [
      {
        movementId: 101,
        installmentIds: [1, 2],
        amount: 100.5,
      },
      {
        movementId: 102,
        installmentIds: [],
        amount: 50,
      },
    ],
  };

  const mockMovementsStoreState = {
    byId: {
      101: {
        id: 101,
        description: "Netflix",
        installmentsData: [
          { id: 1, installmentNumber: 1, totalInstallments: 12 },
          { id: 2, installmentNumber: 2, totalInstallments: 12 },
        ],
      },
      102: {
        id: 102,
        description: "Spotify",
        installmentsData: [],
      },
    },
  };

  let getNextPaymentMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    getNextPaymentMock = vi.fn();
    (useStore as any).mockImplementation(() => mockAccount);
    (accountsStore.getState as any).mockReturnValue({
      accounts: [mockAccount],
      getNextPayment: getNextPaymentMock,
    });
    (currencyStore.getState as any).mockReturnValue({
      getById: () => mockCurrency,
    });
    (movementsStore.getState as any).mockReturnValue(mockMovementsStoreState);
  });

  it("renders loading state initially", () => {
    getNextPaymentMock.mockReturnValue(new Promise(() => {}));
    render(<AccountNextPayment accountId={1} />);
    expect(screen.getByText("Cargando próximo pago...")).toBeInTheDocument();
  });

  it("renders error state on fetch failure", async () => {
    getNextPaymentMock.mockRejectedValue(new Error("Failed"));
    render(<AccountNextPayment accountId={1} />);
    expect(await screen.findByText("Error al cargar el próximo pago.")).toBeInTheDocument();
  });

  it("renders empty state if no payments", async () => {
    getNextPaymentMock.mockResolvedValue({ ...mockNextPayment, movements: [] });
    render(<AccountNextPayment accountId={1} />);
    expect(
      await screen.findByText("No hay pagos pendientes para este periodo."),
    ).toBeInTheDocument();
  });

  it("renders next payment total and date", async () => {
    getNextPaymentMock.mockResolvedValue(mockNextPayment);
    render(<AccountNextPayment accountId={1} />);
    expect(await screen.findByText("Próximo pago")).toBeInTheDocument();
    expect(screen.getByText("Fecha límite: 15/08/2026")).toBeInTheDocument();
    expect(
      screen.getByText(formatAmount(mockNextPayment.totalAmount, mockCurrency)),
    ).toBeInTheDocument();
  });

  it("expands to show movements and installments", async () => {
    getNextPaymentMock.mockResolvedValue(mockNextPayment);
    render(<AccountNextPayment accountId={1} />);

    // Wait for load
    await screen.findByText("Próximo pago");

    // Not expanded
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();

    // Expand
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Expanded
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Cuota 1 de 12, Cuota 2 de 12")).toBeInTheDocument();
    expect(screen.getByText("Spotify")).toBeInTheDocument();
    expect(screen.getByText("Pago")).toBeInTheDocument(); // No installments text
  });

  it("toggles between movements list and payment form", async () => {
    getNextPaymentMock.mockResolvedValue(mockNextPayment);
    render(<AccountNextPayment accountId={1} />);

    // Wait for load
    await screen.findByText("Próximo pago");

    // Expand
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Should show "Pagar Tarjeta" button
    const payButton = screen.getByRole("button", { name: "Pagar Tarjeta" });
    expect(payButton).toBeInTheDocument();

    // Click "Pagar Tarjeta"
    fireEvent.click(payButton);

    // Form should render, movements list should hide
    expect(screen.getByTestId("mock-payment-form")).toBeInTheDocument();
    expect(screen.getByText("Pagar tarjeta - 1 - 150.5")).toBeInTheDocument();
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();

    // Click cancel in form
    fireEvent.click(screen.getByText("Simulate Cancel"));

    // Movements list should show again, form should hide
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-payment-form")).not.toBeInTheDocument();
  });

  it("resets expansion and refreshes next payment on success", async () => {
    getNextPaymentMock.mockResolvedValue(mockNextPayment);
    render(<AccountNextPayment accountId={1} />);

    // Wait for load
    await screen.findByText("Próximo pago");

    // Expand
    fireEvent.click(screen.getByRole("button"));

    // Click "Pagar Tarjeta"
    fireEvent.click(screen.getByRole("button", { name: "Pagar Tarjeta" }));

    // Click success
    fireEvent.click(screen.getByText("Simulate Success"));

    // Form should hide, not expanded
    expect(screen.queryByTestId("mock-payment-form")).not.toBeInTheDocument();
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();

    // Next payment should be refetched (fetchNextPayment is called on mount and on success)
    expect(getNextPaymentMock).toHaveBeenCalledTimes(2);
  });

  it("ignores a stale response after the account changes", async () => {
    let resolveFirst: (value: CreditCardNextPayment) => void = () => undefined;
    let resolveSecond: (value: CreditCardNextPayment) => void = () => undefined;
    getNextPaymentMock
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));
    const { rerender } = render(<AccountNextPayment accountId={1} />);
    rerender(<AccountNextPayment accountId={2} />);

    resolveSecond({ ...mockNextPayment, accountId: 2, totalAmount: 222 });
    expect(await screen.findByText(formatAmount(222, mockCurrency))).toBeInTheDocument();
    resolveFirst({ ...mockNextPayment, totalAmount: 111 });

    expect(screen.queryByText(formatAmount(111, mockCurrency))).not.toBeInTheDocument();
  });

  it("does not update state after unmount", async () => {
    let resolveRequest: (value: CreditCardNextPayment) => void = () => undefined;
    getNextPaymentMock.mockReturnValueOnce(new Promise((resolve) => (resolveRequest = resolve)));
    const { unmount } = render(<AccountNextPayment accountId={1} />);
    unmount();
    resolveRequest(mockNextPayment);
    await Promise.resolve();
  });
});
