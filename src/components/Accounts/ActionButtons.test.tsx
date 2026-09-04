import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "webcoreui";
import { useStore } from "zustand";

import ActionButtons from "@/components/Accounts/ActionButtons";
import { logger } from "@/lib/logger";
import { accountsStore } from "@/stores/accountsStore";
import { MODAL_ID } from "@/types/enums";

vi.mock("@/components/Forms/ConfirmModal", () => ({
  default: ({ buttonTitle, onConfirm, modalId }: any) => (
    <button type="button" data-testid={`confirm-modal-${modalId}`} onClick={() => onConfirm()}>
      {buttonTitle}
    </button>
  ),
}));

function setSearchParams(search: string) {
  window.history.pushState({}, "", `/account${search}`);
}

describe("ActionButtons", () => {
  const mockAccountId = 1;

  beforeEach(() => {
    logger.debug("ActionButtons test beforeEach: clearing mocks and setting search params");
    vi.clearAllMocks();
    setSearchParams("?id=1");
    vi.mocked(useStore).mockReturnValue(undefined);
  });

  it.each([
    [true, "deactivate", MODAL_ID.ACCOUNT.DEACTIVATE, "#account-deactivated"],
    [false, "activate", MODAL_ID.ACCOUNT.ACTIVATE, "#account-activated"],
  ] as const)(
    "changes the account status and shows feedback",
    async (isActive, action, modalId, toastId) => {
      vi.mocked(useStore).mockImplementation((_store: any, selector: any) =>
        selector({ accounts: [{ id: mockAccountId, isActive }] }),
      );
      const actionSpy = vi.spyOn(accountsStore.getState(), action).mockResolvedValue(undefined);
      render(<ActionButtons />);

      fireEvent.click(screen.getByTestId(`confirm-modal-${modalId}`));

      await waitFor(() => expect(actionSpy).toHaveBeenCalledWith(mockAccountId));
      expect(toast).toHaveBeenCalledWith(toastId);
    },
  );

  it("should call accountsStore.remove when delete is confirmed", async () => {
    vi.mocked(useStore).mockImplementation((_store: any, selector: any) =>
      selector({ accounts: [{ id: mockAccountId }] }),
    );

    const removeSpy = vi.spyOn(accountsStore.getState(), "remove").mockResolvedValue(undefined);

    window.history.back = vi.fn();

    render(<ActionButtons />);

    const deleteBtn = screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DELETE}`);

    fireEvent.click(deleteBtn);

    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith(mockAccountId));
  });

  it("should navigate back after account deletion", async () => {
    vi.mocked(useStore).mockImplementation((_store: any, selector: any) =>
      selector({ accounts: [{ id: mockAccountId }] }),
    );

    const backSpy = vi.spyOn(window.history, "back");

    vi.spyOn(accountsStore.getState(), "remove").mockResolvedValue(undefined);

    render(<ActionButtons />);

    const deleteBtn = screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DELETE}`);

    fireEvent.click(deleteBtn);

    await waitFor(() => expect(backSpy).toHaveBeenCalled());
  });
});
