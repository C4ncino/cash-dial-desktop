import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import MovementList from "@/components/Movements/MovementList";

vi.mock("zustand");
vi.mock("zustand/react", () => ({
  useStore: (store: any, selector: any) => useStore(store, selector),
}));

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, className }: any) => <span data-testid="icon" className={className}>{icon}</span>,
}));

vi.mock("@/stores/accountsStore", () => ({
  accountsStore: {
    getState: () => ({
      getById: (id: number) => ({
        id,
        name: `Account ${id}`,
      }),
    }),
  },
}));

vi.mock("@/stores/categoryStore", () => ({
  categoryStore: {
    getState: () => ({
      getById: (id: number) => ({
        id,
        name: `Category ${id}`,
        color: "#ffffff",
        icon: "tag",
      }),
    }),
  },
}));

const mockById: Record<number, Movement> = {
  1: {
    id: 1,
    typeId: 1,
    accountId: 1,
    categoryId: 1,
    currencyId: 1,
    originalAmount: 500,
    accountAmount: 500,
    timestamp: new Date("2024-06-30T12:00:00").getTime(), // 2024-06-30
    description: "Income 1",
  },
  2: {
    id: 2,
    typeId: 2,
    accountId: 1,
    categoryId: 2,
    currencyId: 1,
    originalAmount: 150,
    accountAmount: 150,
    timestamp: new Date("2024-06-30T15:00:00").getTime(), // 2024-06-30
    description: "Expense 1",
  },
  3: {
    id: 3,
    typeId: 2,
    accountId: 2,
    categoryId: 2,
    currencyId: 1,
    originalAmount: 100,
    accountAmount: 100,
    timestamp: new Date("2024-07-01T12:00:00").getTime(), // 2024-07-01
    description: "Expense 2",
  },
};

describe("MovementList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render empty state when no movement IDs are provided", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        byId: mockById,
      }),
    );

    render(<MovementList movementIds={[]} />);
    expect(screen.getByText("No hay movimientos registrados.")).toBeInTheDocument();
  });

  it("should render date headers correctly in Spanish", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        byId: mockById,
      }),
    );

    render(<MovementList movementIds={[1, 3]} />);

    // 2024-06-30: Domingo, 30 de junio de 2024 (or similar depending on platform, but should start with Domingo/Domingo,...)
    expect(screen.getByText(/30 de junio/i)).toBeInTheDocument();
    expect(screen.getByText(/1 de julio/i)).toBeInTheDocument();
  });

  it("should render movement cards under correct dates", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        byId: mockById,
      }),
    );

    render(<MovementList movementIds={[1, 2, 3]} />);

    // We have category name displayed in card: Category 1 (for income), Category 2 (for expenses)
    const category1Elements = screen.getAllByText("Category 1");
    const category2Elements = screen.getAllByText("Category 2");

    expect(category1Elements).toHaveLength(1);
    expect(category2Elements).toHaveLength(2);
  });

  it("should work when rendering all movements (allIds)", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        byId: mockById,
      }),
    );

    const allIds = [1, 2, 3];
    render(<MovementList movementIds={allIds} />);

    expect(screen.getByText("Category 1")).toBeInTheDocument();
    expect(screen.getAllByText("Category 2")).toHaveLength(2);
  });

  it("should work when rendering single account movements (byAccount)", () => {
    (useStore as any).mockImplementation((_store: any, selector: any) =>
      selector({
        byId: mockById,
      }),
    );

    // Account 2 only has movement 3 (Expense 2)
    const account2Movements = [3];
    render(<MovementList movementIds={account2Movements} />);

    expect(screen.queryByText("Category 1")).not.toBeInTheDocument();
    expect(screen.getByText("Category 2")).toBeInTheDocument();
  });
});
