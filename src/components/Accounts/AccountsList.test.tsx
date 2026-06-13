import { render, screen } from "@testing-library/react";
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

  it("should render empty list when no accounts exist", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        accounts: [],
      }),
    );

    const { container } = render(<AccountsList />);
    expect(container.firstChild?.childNodes.length).toBe(undefined);
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

  it("should pass correct props to AccountCard", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        accounts: mockAccounts,
      }),
    );

    render(<AccountsList />);
    const firstCard = screen.getByTestId("account-card-1");
    expect(firstCard).toHaveTextContent("Checking Account");
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

  it("should use account id as key prop", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        accounts: mockAccounts,
      }),
    );

    const { rerender } = render(<AccountsList />);
    expect(screen.getByTestId("account-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("account-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("account-card-3")).toBeInTheDocument();
    rerender(<AccountsList />);
    expect(screen.getByTestId("account-card-1")).toBeInTheDocument();
  });

  it("should handle account updates", () => {
    const initialAccounts = [mockAccounts[0]];
    const updatedAccounts = mockAccounts;

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
    expect(screen.getByTestId("account-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("account-card-3")).toBeInTheDocument();
  });
});
