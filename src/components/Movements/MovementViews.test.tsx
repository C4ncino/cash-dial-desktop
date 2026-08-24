import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand/react";

import GlobalMovements from "@/components/Movements/GlobalMovements";
import MovementsLanding from "@/components/Movements/MovementsLanding";
import { accountsStore } from "@/stores/accountsStore";
import { categoryStore } from "@/stores/categoryStore";
import { movementsStore } from "@/stores/movementsStore";
import { MOVEMENT_TYPES } from "@/types/enums";

vi.mock("@iconify/react", () => ({ Icon: ({ icon }: { icon: string }) => <i>{icon}</i> }));
vi.mock("zustand/react", () => ({ useStore: vi.fn() }));
vi.mock("@/hooks/useDate", () => ({ default: () => ({ time: "01:05 PM" }) }));
vi.mock("@/components/Movements/MovementList", () => ({
  default: ({ movementIds }: { movementIds: number[] }) => (
    <div data-testid="movement-list">{movementIds.join(",")}</div>
  ),
}));
vi.mock("@/components/Movements/MovementCard", () => ({
  default: ({ movement }: { movement: Movement }) => <span>{movement.description}</span>,
}));
vi.mock("@/components/General/AmountText", () => ({
  default: ({ amount, tone, icon }: any) => <span>{`${amount}:${tone}:${icon}`}</span>,
}));
vi.mock("@/components/General/AccountName", () => ({
  default: ({ id }: { id: number }) => <span>{`Account ${id}`}</span>,
}));

const movement = {
  id: 8,
  typeId: MOVEMENT_TYPES.EXPENSE,
  accountId: 2,
  categoryId: 3,
  currencyId: 1,
  originalAmount: 25,
  accountAmount: 25,
  timestamp: 1,
  description: "Lunch",
} as Movement;

describe("movement views", () => {
  beforeEach(() => {
    vi.mocked(useStore).mockImplementation((store: unknown, selector: (state: any) => unknown) => {
      if (store === movementsStore)
        return selector({ allIds: [8, 7], byId: { 8: movement, 7: { ...movement, id: 7, description: "Older" } } });
      return undefined;
    });
    vi.spyOn(accountsStore.getState(), "getById").mockReturnValue({ id: 2 } as Account);
    vi.spyOn(categoryStore.getState(), "getById").mockReturnValue({
      id: 3,
      fatherId: null,
      name: "Food",
      color: "#fff",
      icon: "food",
    } as Category);
  });

  it("passes the global ordered IDs to MovementList", () => {
    render(<GlobalMovements />);
    expect(screen.getByTestId("movement-list")).toHaveTextContent("8,7");
  });

  it("renders indexed landing movements in order and links to the full list", () => {
    render(<MovementsLanding />);
    expect(screen.getAllByText(/Lunch|Older/).map((node) => node.textContent)).toEqual([
      "Lunch",
      "Older",
    ]);
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/movements",
    );
  });

});
