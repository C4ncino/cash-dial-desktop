import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import AccountName from "@/components/General/AccountName";
import { accountsStore } from "@/stores/accountsStore";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) => (
    <span data-testid="account-icon" data-icon={icon} className={className} />
  ),
}));

describe("AccountName", () => {
  it("renders the account resolved by id", () => {
    vi.mocked(useStore).mockImplementation((store: any, selector: any) =>
      store === accountsStore
        ? selector({ accounts: [{ id: 2, name: "Cash", type: { icon: "cash" } }] })
        : undefined,
    );
    render(<AccountName id={2} />);
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByTestId("account-icon")).toHaveAttribute("data-icon", "iconoir:cash");
    expect(screen.getByTestId("account-icon")).toHaveClass("text-zinc-400");
  });

  it("renders a fallback when the account is missing", () => {
    vi.mocked(useStore).mockImplementation((store: any, selector: any) =>
      store === accountsStore ? selector({ accounts: [] }) : undefined,
    );
    render(<AccountName id={2} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
