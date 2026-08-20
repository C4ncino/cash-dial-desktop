import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { modal } from "webcoreui";

import ConfirmModal from "@/components/Forms/ConfirmModal";
import { logger } from "@/lib/logger";

describe("ConfirmModal", () => {
  const mockOnConfirm = vi.fn();
  const defaultProps = {
    buttonTitle: "Delete",
    modalTitle: "Confirm Deletion",
    modalId: "delete-modal",
    description: "Are you sure you want to delete this item?",
    theme: "alert" as const,
    onConfirm: mockOnConfirm,
  };

  const mockModalInstance = {
    open: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    logger.debug("ConfirmModal test beforeEach: clearing mocks");
    vi.clearAllMocks();
    (modal as any).mockReturnValue(mockModalInstance);
  });

  it("should render the confirmation contract", async () => {
    render(<ConfirmModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("open-modal-button")).toBeInTheDocument();
      expect(screen.getByTestId("confirm-button")).toBeInTheDocument();
      expect(screen.getByTestId("modal")).toHaveAttribute("data-title", "Confirm Deletion");
      expect(screen.getByText("Are you sure you want to delete this item?")).toBeInTheDocument();
      expect(screen.getByText("Cancelar")).toBeInTheDocument();
    });
  });

  it("should open modal when button is clicked", async () => {
    render(<ConfirmModal {...defaultProps} />);

    const openButton = screen.getByTestId("open-modal-button");

    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockModalInstance.open).toHaveBeenCalled();
    });
  });

  it("should confirm the action and close the modal", async () => {
    render(<ConfirmModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("confirm-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirm-button"));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockModalInstance.close).toHaveBeenCalledTimes(1);
  });

  it("should close modal when cancel button is clicked", async () => {
    render(<ConfirmModal {...defaultProps} />);

    await waitFor(() => {
      const cancelButton = screen.getByText("Cancelar");
      fireEvent.click(cancelButton);
      expect(mockModalInstance.close).toHaveBeenCalled();
    });
  });

  it("should initialize modal with correct id", () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(modal).toHaveBeenCalledWith("#delete-modal");
  });

  it("should update modal id when modalId prop changes", () => {
    const { rerender } = render(<ConfirmModal {...defaultProps} />);

    expect(modal).toHaveBeenCalledWith("#delete-modal");

    const newProps = { ...defaultProps, modalId: "new-modal" };
    rerender(<ConfirmModal {...newProps} />);

    expect(modal).toHaveBeenLastCalledWith("#new-modal");
  });

  it("should apply custom button class when provided", () => {
    const customProps = {
      ...defaultProps,
      buttonClassName: "custom-class",
    };
    render(<ConfirmModal {...customProps} />);

    const button = screen.getByTestId("open-modal-button");

    expect(button).toHaveClass("custom-class");
  });

});
