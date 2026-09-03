import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import AccountsList from "@/components/Accounts/AccountsList";
import { logger } from "@/lib/logger";

vi.mock("zustand");
vi.mock("@/components/Accounts/AccountCard", () => ({
  default: ({ id, name }: any) => <div data-testid={`account-card-${id}`}>{name}</div>,
}));

const mockAccounts: Account[] = [
  {
    id: 1,
    type: { id: 1, name: "Checking", icon: "check", color: "#3b82f6" },
    currencyId: 1,
    name: "Checking Account",
    balance: 5000,
    isActive: true,
  },
  {
    id: 2,
    type: { id: 2, name: "Savings", icon: "save", color: "#10b981" },
    currencyId: 1,
    name: "Savings Account",
    balance: 15000,
    isActive: true,
  },
  {
    id: 3,
    type: { id: 3, name: "Credit Card", icon: "credit", color: "#ef4444" },
    currencyId: 1,
    name: "Credit Card Account",
    balance: 1200,
    creditInfo: { creditLimit: 5000, cutoffDay: 15, daysToPay: 20 },
    isActive: true,
  },
];

describe("AccountsList", () => {
  logger.debug("AccountsList tests starting");
  beforeEach(() => {
    logger.debug("AccountsList beforeEach: clearing mocks");
    vi.clearAllMocks();
  });

  it("should render an empty state when no accounts exist", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        accounts: [],
      }),
    );

    render(<AccountsList />);
    expect(screen.getByText("Aún no tienes cuentas.")).toBeInTheDocument();
  });

  it("should render all accounts", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        accounts: mockAccounts,
      }),
    );

    render(<AccountsList />);
    expect(screen.getByTestId("account-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("account-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("account-card-3")).toBeInTheDocument();
  });

  it("should render account names in cards", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        accounts: mockAccounts,
      }),
    );

    render(<AccountsList />);
    expect(screen.getByText("Checking Account")).toBeInTheDocument();
    expect(screen.getByText("Savings Account")).toBeInTheDocument();
    expect(screen.getByText("Credit Card Account")).toBeInTheDocument();
  });

  it("should render single account", () => {
    const singleAccount = [mockAccounts[0]];

    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        accounts: singleAccount,
      }),
    );

    render(<AccountsList />);
    expect(screen.getByTestId("account-card-1")).toBeInTheDocument();
    expect(screen.queryByTestId("account-card-2")).not.toBeInTheDocument();
  });

  it("should reflect account updates without losing other accounts", () => {
    const initialAccounts = [mockAccounts[0]];
    const updatedAccounts = [{ ...mockAccounts[0], name: "Updated Checking" }, mockAccounts[2]];

    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        accounts: initialAccounts,
      }),
    );

    const { rerender } = render(<AccountsList />);
    expect(screen.getByTestId("account-card-1")).toBeInTheDocument();
    expect(screen.queryByTestId("account-card-2")).not.toBeInTheDocument();

    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        accounts: updatedAccounts,
      }),
    );

    rerender(<AccountsList />);
    expect(screen.getByText("Updated Checking")).toBeInTheDocument();
    expect(screen.queryByTestId("account-card-2")).not.toBeInTheDocument();
    expect(screen.getByTestId("account-card-3")).toBeInTheDocument();
  });

  it("filters by type and status", () => {
    const accounts = [{ ...mockAccounts[0], isActive: false }, ...mockAccounts.slice(1)];
    (useStore as any).mockImplementation((_store: any, selector: any) => selector({ accounts }));
    render(<AccountsList />);

    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "2" } });
    expect(screen.getByText("Savings Account")).toBeInTheDocument();
    expect(screen.queryByText("Checking Account")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "inactive" } });
    expect(screen.getByText("Checking Account")).toBeInTheDocument();
    expect(screen.queryByText("Savings Account")).not.toBeInTheDocument();
  });

  it("searches names case-insensitively, resets type, and preserves status", () => {
    const accounts = [{ ...mockAccounts[0], isActive: false }, ...mockAccounts.slice(1)];
    (useStore as any).mockImplementation((_store: any, selector: any) => selector({ accounts }));
    render(<AccountsList />);

    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "inactive" } });
    fireEvent.change(screen.getByLabelText("Buscar por nombre"), {
      target: { value: "  CHECKING  " },
    });

    expect(screen.getByLabelText("Tipo")).toHaveValue("0");
    expect(screen.getByLabelText("Estado")).toHaveValue("inactive");
    expect(screen.getByText("Checking Account")).toBeInTheDocument();
  });

  it("paginates filtered accounts eight at a time and resets after a filter change", () => {
    const accounts = Array.from({ length: 10 }, (_, index) => ({
      ...mockAccounts[0],
      id: index + 1,
      name: `Account ${index + 1}`,
    }));
    (useStore as any).mockImplementation((_store: any, selector: any) => selector({ accounts }));
    render(<AccountsList />);

    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    expect(screen.getByText("Account 8")).toBeInTheDocument();
    expect(screen.queryByText("Account 9")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(screen.getByText("Account 9")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar por nombre"), {
      target: { value: "Account" },
    });
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    expect(screen.getByText("Account 1")).toBeInTheDocument();
  });

  it("shows a filtered empty state and hides pagination for one page", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({ accounts: mockAccounts }),
    );
    render(<AccountsList />);
    fireEvent.change(screen.getByLabelText("Buscar por nombre"), {
      target: { value: "missing" },
    });
    expect(screen.getByText("No hay cuentas que coincidan con estos filtros.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Paginación de cuentas" })).toBeNull();
  });
});
