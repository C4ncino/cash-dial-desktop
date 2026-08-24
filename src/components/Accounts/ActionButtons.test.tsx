import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  });

  it("should call accountsStore.remove when delete is confirmed", async () => {
    const removeSpy = vi.spyOn(accountsStore.getState(), "remove");

    window.history.back = vi.fn();

    render(<ActionButtons />);

    const deleteBtn = screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DELETE}`);

    fireEvent.click(deleteBtn);

    expect(removeSpy).toHaveBeenCalledWith(mockAccountId);
  });

  it("should navigate back after account deletion", () => {
    const backSpy = vi.spyOn(window.history, "back");

    vi.spyOn(accountsStore.getState(), "remove").mockResolvedValue(undefined);

    render(<ActionButtons />);

    const deleteBtn = screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DELETE}`);

    fireEvent.click(deleteBtn);

    expect(backSpy).toHaveBeenCalled();
  });
});
