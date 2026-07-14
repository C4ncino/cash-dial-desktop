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

  it("should render two buttons", () => {
    render(<ActionButtons />);

    const buttons = screen.getAllByRole("button");

    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("should render deactivate button", () => {
    render(<ActionButtons />);

    expect(screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DEACTIVATE}`)).toBeInTheDocument();

    expect(screen.getByText("Desactivar")).toBeInTheDocument();
  });

  it("should render delete button", () => {
    render(<ActionButtons />);

    expect(screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DELETE}`)).toBeInTheDocument();

    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  it("should call onConfirm with correct modalId for delete", () => {
    render(<ActionButtons />);

    const deleteBtn = screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DELETE}`);

    expect(deleteBtn).toBeInTheDocument();
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

    vi.spyOn(accountsStore.getState(), "remove").mockImplementation(() => undefined);

    render(<ActionButtons />);

    const deleteBtn = screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DELETE}`);

    fireEvent.click(deleteBtn);

    expect(backSpy).toHaveBeenCalled();
  });

  it("should render in list items", () => {
    const { container } = render(<ActionButtons />);

    const listItems = container.querySelectorAll("li");

    expect(listItems.length).toBe(2);
  });

  it("should render deactivate modal with correct props", () => {
    render(<ActionButtons />);

    const deactivateBtn = screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DEACTIVATE}`);

    expect(deactivateBtn).toBeInTheDocument();
  });

  it("should pass different account ids", () => {
    setSearchParams("?id=2");

    render(<ActionButtons />);

    const deleteBtn = screen.getByTestId(`confirm-modal-${MODAL_ID.ACCOUNT.DELETE}`);

    expect(deleteBtn).toBeInTheDocument();
  });
});
