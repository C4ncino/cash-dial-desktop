import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import SelectAccounts from "@/components/Forms/SelectAccounts";
import { accountsStore } from "@/stores/accountsStore";

vi.mock("zustand");
vi.mock("@/stores/accountsStore");

const mockAccounts = [
  {
    id: 1,
    name: "Cash Wallet",
    balance: 500,
    currencyId: 1,
    type: { id: 1, name: "Cash", icon: "cash", color: "#00a63e" },
    isActive: true,
    creditInfo: null,
  },
  {
    id: 2,
    name: "Inactive Savings",
    balance: 1000,
    currencyId: 1,
    type: { id: 2, name: "Debit", icon: "card", color: "#00a63e" },
    isActive: false,
    creditInfo: null,
  },
  {
    id: 3,
    name: "Visa Credit Card",
    balance: -200,
    currencyId: 1,
    type: { id: 3, name: "Credit", icon: "credit-card", color: "#00a63e" },
    isActive: true,
    creditInfo: {
      creditLimit: 5000,
      cutoffDay: 10,
      daysToPay: 20,
    },
  },
];

const mockUseStoreState = (accounts = mockAccounts) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === accountsStore) {
      return selector({
        accounts,
      });
    }
    return undefined;
  });
};

describe("SelectAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStoreState();
  });

  it("should render only active accounts by default", () => {
    render(<SelectAccounts name="source" label="Cuenta Origen" />);

    expect(screen.getByLabelText("Cuenta Origen")).toBeInTheDocument();

    // Inactive account shouldn't be here
    expect(screen.queryByText("Inactive Savings")).not.toBeInTheDocument();

    // Active accounts should be here
    expect(screen.getByText("Cash Wallet")).toBeInTheDocument();
    expect(screen.getByText("Visa Credit Card")).toBeInTheDocument();
  });

  it("should exclude specific account when excludeId is provided", () => {
    render(<SelectAccounts name="source" label="Cuenta Origen" excludeId={1} />);

    // Cash Wallet (id: 1) should be excluded
    expect(screen.queryByText("Cash Wallet")).not.toBeInTheDocument();
    // Visa Credit Card should still be present
    expect(screen.getByText("Visa Credit Card")).toBeInTheDocument();
  });

  it("should exclude credit accounts when excludeCredit is true", () => {
    render(<SelectAccounts name="source" label="Cuenta Origen" excludeCredit />);

    // Cash Wallet should be present
    expect(screen.getByText("Cash Wallet")).toBeInTheDocument();
    // Visa Credit Card (which has creditInfo) should be excluded
    expect(screen.queryByText("Visa Credit Card")).not.toBeInTheDocument();
  });

  it("should invoke onChange callback when selecting a new option", () => {
    const mockOnChange = vi.fn();
    render(<SelectAccounts name="source" label="Cuenta Origen" onChange={mockOnChange} />);

    const select = screen.getByLabelText("Cuenta Origen");
    fireEvent.change(select, { target: { value: "3" } });

    expect(mockOnChange).toHaveBeenCalledWith(3);
  });

  it("should expose the selected account value and update it through user selection", () => {
    const mockOnChange = vi.fn();
    render(
      <SelectAccounts name="source" label="Cuenta Origen" accountId={1} onChange={mockOnChange} />,
    );

    const select = screen.getByLabelText("Cuenta Origen") as HTMLSelectElement;
    expect(select.value).toBe("1");

    fireEvent.change(select, { target: { value: "3" } });
    expect(select.value).toBe("3");
    expect(mockOnChange).toHaveBeenCalledWith(3);
  });
});
