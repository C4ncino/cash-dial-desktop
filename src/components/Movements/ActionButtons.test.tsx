import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "webcoreui";
import { useStore } from "zustand";

import ActionButtons from "@/components/Movements/ActionButtons";
import { accountsStore } from "@/stores/accountsStore";
import { editStore } from "@/stores/editStore";
import { movementsStore } from "@/stores/movementsStore";
import { EDIT_TYPES, MODAL_ID, MOVEMENT_TYPES } from "@/types/enums";

const toastMock = vi.mocked(toast);

vi.mock("@/components/Forms/ConfirmModal", () => ({
  default: ({ buttonTitle, onConfirm, modalId }: any) => (
    <button type="button" data-testid={`confirm-${modalId}`} onClick={onConfirm}>
      {buttonTitle}
    </button>
  ),
}));

const baseMovement: Movement = {
  id: 1,
  typeId: MOVEMENT_TYPES.INCOME,
  accountId: 1,
  categoryId: 1,
  currencyId: 1,
  originalAmount: 100,
  accountAmount: 100,
  timestamp: 1719705600,
  description: "Test movement",
  installments: 1,
  installmentsData: [],
};

function setSearchParams(search: string) {
  window.history.pushState({}, "", `/movement${search}`);
}

describe("Movement ActionButtons", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setSearchParams("?id=1");
  });

  const setupStoresMock = (movement: Movement | undefined) => {
    (useStore as any).mockImplementation((store, selector) => {
      if (store === movementsStore) {
        return selector({
          byId: movement ? { [movement.id]: movement } : {},
        });
      }

      return selector(store.getState());
    });
  };

  it("renders nothing when there is no movement", () => {
    vi.spyOn(movementsStore, "getState").mockReturnValue({
      byId: {},
    } as any);

    window.history.pushState({}, "", "/movements?id=1");

    const { container } = render(<ActionButtons />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [MOVEMENT_TYPES.INCOME, EDIT_TYPES.INCOME, MODAL_ID.MOVEMENT.INCOME.EDIT],
    [MOVEMENT_TYPES.EXPENSE, EDIT_TYPES.EXPENSE, MODAL_ID.MOVEMENT.EXPENSE.EDIT],
    [MOVEMENT_TYPES.TRANSFER, EDIT_TYPES.TRANSFER, MODAL_ID.MOVEMENT.TRANSFER.EDIT],
  ])("opens the correct edit modal for movement type %s", (movementType, editType, modalId) => {
    setupStoresMock({
      ...baseMovement,
      typeId: movementType,
    });

    const setIdSpy = vi.spyOn(editStore.getState(), "setId");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<ActionButtons />);

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(setIdSpy).toHaveBeenCalledWith(1, editType);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "modal:open",
        detail: {
          id: modalId,
        },
      }),
    );
  });

  it.each([
    [MOVEMENT_TYPES.INCOME, MODAL_ID.MOVEMENT.INCOME.DELETE, "#income-deleted"],
    [MOVEMENT_TYPES.EXPENSE, MODAL_ID.MOVEMENT.EXPENSE.DELETE, "#expense-deleted"],
    [MOVEMENT_TYPES.TRANSFER, MODAL_ID.MOVEMENT.TRANSFER.DELETE, "#transfer-deleted"],
  ])("deletes a %s movement", async (movementType, modalId, toastId) => {
    setupStoresMock({
      ...baseMovement,
      typeId: movementType,
      toAccountId: 30,
    });

    const removeSpy = vi.spyOn(movementsStore.getState(), "remove").mockResolvedValueOnce();
    const updateBalanceSpy = vi
      .spyOn(accountsStore.getState(), "updateBalance")
      .mockResolvedValueOnce([1, 30]);
    const backSpy = vi.spyOn(window.history, "back");

    render(<ActionButtons />);

    fireEvent.click(screen.getByTestId(`confirm-${modalId}`));

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(1);
    });

    expect(removeSpy).toHaveBeenCalledWith(1);
    expect(updateBalanceSpy).toHaveBeenCalledWith(1, 30);
    expect(toastMock).toHaveBeenCalledWith(toastId);
    expect(backSpy).toHaveBeenCalled();
  });
});
