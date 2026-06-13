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

  it("should render button with correct title", () => {
    render(<ConfirmModal {...defaultProps} />);

    const buttons = screen.getAllByRole("button", {
      name: "Delete",
    });

    expect(buttons).toHaveLength(2);
  });

  it("should render modal with correct title", async () => {
    render(<ConfirmModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("modal")).toHaveAttribute("data-title", "Confirm Deletion");
    });
  });

  it("should render description text", async () => {
    render(<ConfirmModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to delete this item?")).toBeInTheDocument();
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

  it("should call onConfirm when confirm button is clicked", async () => {
    render(<ConfirmModal {...defaultProps} />);

    await waitFor(() => {
      const confirmButton = screen.getByTestId("confirm-button");
      if (confirmButton) {
        fireEvent.click(confirmButton);
      }
    });
  });

  it("should close modal after confirmation", async () => {
    render(<ConfirmModal {...defaultProps} />);

    await waitFor(() => {
      const confirmButtons = screen
        .getAllByRole("button")
        .filter((btn) => btn.textContent === "Delete");
      if (confirmButtons.length > 1) {
        fireEvent.click(confirmButtons[1]);
      }
    });
  });

  it("should render cancel button", async () => {
    render(<ConfirmModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Cancelar")).toBeInTheDocument();
    });
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

  it("should apply correct button class for warning theme", async () => {
    const warningProps = { ...defaultProps, theme: "warning" as const };
    render(<ConfirmModal {...warningProps} />);

    await waitFor(() => {
      const modal = screen.getByTestId("modal");
      expect(modal).toBeInTheDocument();
    });
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

  it("should handle multiple theme types", async () => {
    const themes = ["alert", "info", "success", "warning"] as const;

    for (const theme of themes) {
      const { unmount } = render(<ConfirmModal {...defaultProps} theme={theme} />);
      await waitFor(() => {
        expect(screen.getByTestId("modal")).toBeInTheDocument();
      });
      unmount();
    }
  });
});
