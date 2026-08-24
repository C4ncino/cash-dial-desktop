import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import PlanningActions from "@/components/Plannings/PlanningActions";
import { planningsStore } from "@/stores/planningsStore";

vi.mock("@/components/Forms/ConfirmModal", () => ({
  default: ({ buttonTitle, onConfirm }: { buttonTitle: string; onConfirm: () => void }) => (
    <button type="button" onClick={onConfirm}>
      {buttonTitle}
    </button>
  ),
}));

const planning = {
  id: 7,
  recurringRule: { isActive: true },
};

describe("PlanningActions", () => {
  const deactivate = vi.fn().mockResolvedValue(undefined);
  const activate = vi.fn().mockResolvedValue(undefined);
  const remove = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/planning-detail?id=7");
    vi.mocked(useStore).mockImplementation((store: any, selector: any) =>
      store === planningsStore ? selector({ plannings: [planning] }) : undefined,
    );
    vi.spyOn(planningsStore, "getState").mockReturnValue({ deactivate, activate, remove } as never);
  });

  it("confirms deactivation for an active planning", async () => {
    render(<PlanningActions />);
    fireEvent.click(screen.getByText("Desactivar"));
    await waitFor(() => expect(deactivate).toHaveBeenCalledWith(7));
  });

  it("confirms deletion and removes the planning", async () => {
    render(<PlanningActions />);
    fireEvent.click(screen.getByText("Eliminar"));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(7));
  });
});
