import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import CreateMovementMenu from "@/components/Movements/CreateMovementMenu";
import { MOVEMENT_CREATE_REQUEST } from "@/lib/movementCreation";
import { ACCOUNT_TYPES, MOVEMENT_TYPES } from "@/types/enums";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, className }: React.ComponentProps<"span"> & { icon: string }) => (
    <span data-icon={icon} className={className} />
  ),
}));

const cashAccount: Account = {
  id: 1,
  name: "Wallet",
  balance: 500,
  isActive: true,
  currencyId: 1,
  type: { id: ACCOUNT_TYPES.CASH, name: "Cash", icon: "cash", color: "green" },
  creditInfo: undefined,
};
const otherAccount: Account = { ...cashAccount, id: 2, name: "Checking" };

const useAccounts = (accounts: Account[]) => {
  vi.mocked(useStore).mockImplementation((_store: unknown, selector: any) =>
    selector({ accounts }),
  );
};

describe("CreateMovementMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
    useAccounts([cashAccount, otherAccount]);
  });

  it("opens labeled actions and requests the selected movement type", () => {
    const listener = vi.fn();
    window.addEventListener(MOVEMENT_CREATE_REQUEST, listener);
    render(<CreateMovementMenu />);

    const trigger = screen.getByRole("button", { name: "Añadir movimiento" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Añadir gasto" }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      detail: { typeId: MOVEMENT_TYPES.EXPENSE, accountId: undefined },
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    window.removeEventListener(MOVEMENT_CREATE_REQUEST, listener);
  });

  it("uses the movement type colors for outlined actions", () => {
    render(<CreateMovementMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir movimiento" }));

    expect(screen.getByRole("menuitem", { name: "Añadir ingreso" })).toHaveClass(
      "border-blue-600",
      "text-blue-600",
    );
    expect(screen.getByRole("menuitem", { name: "Añadir gasto" })).toHaveClass(
      "border-amber-600",
      "text-amber-600",
    );
    expect(screen.getByRole("menuitem", { name: "Añadir transferencia" })).toHaveClass(
      "border-lime-600",
      "text-lime-600",
    );
    expect(screen.getAllByRole("menuitem")[2].querySelector(".rotate-90")).toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the trigger", () => {
    render(<CreateMovementMenu />);
    const trigger = screen.getByRole("button", { name: "Añadir movimiento" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("disables every contextual action for an inactive account", () => {
    window.history.replaceState({}, "", "/account?id=1");
    useAccounts([{ ...cashAccount, isActive: false }, otherAccount]);
    render(<CreateMovementMenu accountContext />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir movimiento" }));
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    for (const action of screen.getAllByRole("menuitem")) expect(action).toBeDisabled();
  });

  it("prefills valid actions but disables transfer for a credit card", () => {
    window.history.replaceState({}, "", "/account?id=3");
    const creditAccount = {
      ...cashAccount,
      id: 3,
      type: { ...cashAccount.type, id: ACCOUNT_TYPES.CREDIT },
      creditInfo: { creditLimit: 1000, cutoffDay: 10, daysToPay: 20 },
    };
    useAccounts([creditAccount, otherAccount]);
    const listener = vi.fn();
    window.addEventListener(MOVEMENT_CREATE_REQUEST, listener);
    render(<CreateMovementMenu accountContext />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir movimiento" }));

    expect(screen.getByRole("menuitem", { name: "Añadir transferencia" })).toBeDisabled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Añadir ingreso" }));
    expect(listener.mock.calls[0][0]).toMatchObject({
      detail: { typeId: MOVEMENT_TYPES.INCOME, accountId: 3 },
    });
    window.removeEventListener(MOVEMENT_CREATE_REQUEST, listener);
  });

  it("disables transfer when the current account has no active destination", () => {
    window.history.replaceState({}, "", "/account?id=1");
    useAccounts([cashAccount, { ...otherAccount, isActive: false }]);
    render(<CreateMovementMenu accountContext />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir movimiento" }));
    expect(screen.getByRole("menuitem", { name: "Añadir transferencia" })).toBeDisabled();
  });
});
