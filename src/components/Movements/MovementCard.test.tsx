import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import MovementCard from "@/components/Movements/MovementCard";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, className }: any) => (
    <span data-testid="icon" className={className}>
      {icon}
    </span>
  ),
}));

vi.mock("@/stores/accountsStore", () => ({
  accountsStore: {
    getState: () => ({
      getById: (id: number) => {
        if (id === 1) {
          return { id: 1, name: "Source Account", currencyId: 1, type: { icon: "wallet" } };
        }
        if (id === 2) {
          return { id: 2, name: "Dest Account", currencyId: 1, type: { icon: "card" } };
        }
        return undefined;
      },
      accounts: [
        { id: 1, name: "Source Account", type: { icon: "wallet" } },
        { id: 2, name: "Dest Account", type: { icon: "card" } },
      ],
    }),
  },
}));

vi.mock("zustand");

vi.mock("@/stores/categoryStore", () => ({
  categoryStore: {
    getState: () => ({
      getById: (id: number) => {
        if (id === 5) {
          return { id: 5, name: "Food", icon: "fast-food", color: "#ef4444" };
        }
        return undefined;
      },
    }),
  },
}));

const mockMovement: Movement = {
  id: 10,
  typeId: 2, // Expense
  accountId: 1,
  categoryId: 5,
  currencyId: 1,
  originalAmount: 150.75,
  accountAmount: 150.75,
  timestamp: new Date("2024-06-30T12:00:00").getTime(),
  description: "Lunch",
};

describe("MovementCard", () => {
  beforeEach(() => {
    vi.mocked(useStore).mockImplementation((store: any, selector: any) =>
      selector(store.getState()),
    );
  });

  it("should render movement category and account name", () => {
    render(<MovementCard movement={mockMovement} />);

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Source Account")).toBeInTheDocument();
  });

  it("should render as a link to movement detail page", () => {
    render(<MovementCard movement={mockMovement} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/movement?id=10");
  });

  it("should show transfer destination account when applicable", () => {
    const transferMovement: Movement = {
      ...mockMovement,
      typeId: 3, // Transfer
      toAccountId: 2,
    };

    render(<MovementCard movement={transferMovement} />);

    expect(screen.getByText("Source Account")).toBeInTheDocument();
    expect(screen.getByText("Dest Account")).toBeInTheDocument();
  });
});
