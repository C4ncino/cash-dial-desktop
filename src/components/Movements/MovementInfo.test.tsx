import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import MovementInfo from "@/components/Movements/MovementInfo";
import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";
import { currencyStore } from "@/stores/currencyStore";
import { movementsStore } from "@/stores/movementsStore";

vi.mock("zustand");
vi.mock("zustand/react", () => ({
  useStore: (store: any, selector: any) => useStore(store, selector),
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, className }: any) => (
    <span data-testid="icon" className={className}>
      {icon}
    </span>
  ),
}));

const mockMovement: Movement = {
  id: 1,
  typeId: 2, // Expense
  accountId: 1,
  categoryId: 5,
  currencyId: 1,
  originalAmount: 150.0,
  accountAmount: 150.0,
  timestamp: new Date("2024-06-30T12:00:00").getTime(),
  description: "Lunch",
};

function setSearchParams(search: string) {
  window.history.pushState({}, "", `/movement${search}`);
}

describe("MovementInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSearchParams("?id=1");
  });

  const setupStoresMock = (movement: Movement | undefined) => {
    (useStore as any).mockImplementation((store: any, selector: any) => {
      if (store === movementsStore) {
        return selector({
          byId: movement ? { [movement.id]: movement } : {},
          types: [
            { id: 1, name: "Ingreso", key: "in" },
            { id: 2, name: "Gasto", key: "out" },
            { id: 3, name: "Transferencia", key: "transfer" },
          ],
        });
      }
      if (store === accountsStore) {
        return selector({
          accounts: [
            { id: 1, name: "Source Account", currencyId: 1 },
            { id: 2, name: "Dest Account", currencyId: 1 },
            { id: 3, name: "USD Account", currencyId: 2 },
          ],
        });
      }
      if (store === categoryStore) {
        return selector({
          categories: [{ id: 5, name: "Food", icon: "fast-food", color: "#ef4444" }],
        });
      }
      if (store === currencyStore) {
        return selector({
          currencies: [
            { id: 1, name: "Peso Mexicano", code: "MXN", symbol: "$" },
            { id: 2, name: "Dólar Estadounidense", code: "USD", symbol: "$" },
          ],
        });
      }
      return undefined;
    });
  };

  it("should render missing movement state when movement is not found", () => {
    setSearchParams("?id=999");
    setupStoresMock(undefined);

    render(<MovementInfo />);

    expect(screen.getByText("Movimiento no encontrado")).toBeInTheDocument();
  });

  it("should render rendering a movement correctly", () => {
    setupStoresMock(mockMovement);

    render(<MovementInfo />);

    expect(screen.getByRole("heading", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Source Account")).toBeInTheDocument();
  });

  it("should render expense movement properties", () => {
    setupStoresMock({
      ...mockMovement,
      typeId: 2,
    });

    render(<MovementInfo />);

    expect(screen.getAllByText("Gasto").length).toBeGreaterThan(0);
  });

  it("should render income movement properties", () => {
    setupStoresMock({
      ...mockMovement,
      typeId: 1,
    });

    render(<MovementInfo />);

    expect(screen.getAllByText("Ingreso").length).toBeGreaterThan(0);
  });

  it("should render transfer movement properties and accounts", () => {
    setupStoresMock({
      ...mockMovement,
      typeId: 3,
      toAccountId: 2,
    });

    render(<MovementInfo />);

    expect(screen.getAllByText("Transferencia").length).toBeGreaterThan(0);
    expect(screen.getByText("Cuenta destino")).toBeInTheDocument();
    expect(screen.getByText("Dest Account")).toBeInTheDocument();
  });

  it("maps cross-currency transfer amounts from the source currency to the destination", () => {
    setupStoresMock({
      ...mockMovement,
      typeId: 3,
      toAccountId: 3,
      originalAmount: 10,
      accountAmount: 0.5,
    });

    render(<MovementInfo />);

    expect(screen.getAllByRole("heading", { name: "Información de divisa" })).toHaveLength(1);
    expect(screen.getByText("Peso Mexicano (MXN)")).toBeInTheDocument();
    expect(screen.getByText("1 MXN = 0.0500 USD")).toBeInTheDocument();
    expect(screen.getByText("Monto original").parentElement).toHaveTextContent(/10[.,]00/);
    expect(screen.getByText("Monto convertido").parentElement).toHaveTextContent(/0[.,]50/);
  });

  it("should conditionally render optional sections like description and currency details", () => {
    // 1. Without description
    setupStoresMock({
      ...mockMovement,
      description: undefined,
    });

    const { rerender } = render(<MovementInfo />);
    expect(screen.queryByText("Descripción")).not.toBeInTheDocument();

    // 2. With currency conversion (original currency 2 USD vs account currency 1 MXN)
    setupStoresMock({
      ...mockMovement,
      currencyId: 2, // USD
      originalAmount: 10,
      accountAmount: 200, // Converted
    });

    rerender(<MovementInfo />);
    expect(screen.getByText("Información de divisa")).toBeInTheDocument();
    expect(screen.getByText("Monto convertido")).toBeInTheDocument();
    expect(screen.getByText(/1 USD = 20.0000 MXN/)).toBeInTheDocument();
  });

  it("should render installments section when movement has installmentsData", () => {
    setupStoresMock({
      ...mockMovement,
      installments: 3,
      installmentsData: [
        {
          id: 10,
          movementId: 1,
          installmentNumber: 1,
          totalInstallments: 3,
          amount: 50,
          dueTimestamp: new Date("2024-07-30").getTime(),
          paid: true,
          paidTimestamp: new Date("2024-07-28").getTime(),
        },
        {
          id: 11,
          movementId: 1,
          installmentNumber: 2,
          totalInstallments: 3,
          amount: 50,
          dueTimestamp: new Date("2024-08-30").getTime(),
          paid: false,
          paidTimestamp: null,
        },
        {
          id: 12,
          movementId: 1,
          installmentNumber: 3,
          totalInstallments: 3,
          amount: 50,
          dueTimestamp: new Date("2024-09-30").getTime(),
          paid: false,
          paidTimestamp: null,
        },
      ],
    });

    render(<MovementInfo />);

    expect(screen.getAllByText("Mensualidades").length).toBeGreaterThan(0);
    expect(screen.getByText("Mensualidad 1 de 3")).toBeInTheDocument();
    expect(screen.getByText("Mensualidad 2 de 3")).toBeInTheDocument();
    expect(screen.getByText("Mensualidad 3 de 3")).toBeInTheDocument();

    // First installment is paid
    expect(screen.getByText(/Pagado el/)).toBeInTheDocument();

    // Two unpaid installments
    expect(screen.getAllByText(/Vence el/)).toHaveLength(2);
  });

  it("should not render installments section when movement has no installmentsData", () => {
    setupStoresMock(mockMovement);

    render(<MovementInfo />);

    expect(screen.queryByText("Mensualidades")).not.toBeInTheDocument();
  });
});
