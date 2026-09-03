import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import AccountInfo from "@/components/Accounts/AccountInfo";
import { formatNumber } from "@/lib/formatters";
import { logger } from "@/lib/logger";

vi.mock("zustand");
vi.mock("@/components/Accounts/AccountNextPayment", () => ({
  default: () => <div data-testid="next-payment" />,
}));

const mockAccount: Account = {
  id: 1,
  type: {
    id: 1,
    name: "Credit Card",
    icon: "credit",
    color: "#ef4444",
  },
  currencyId: 1,
  name: "My Credit Card",
  balance: 1200.75,
  creditInfo: {
    creditLimit: 5000,
    cutoffDay: 15,
    daysToPay: 20,
  },
  isActive: true,
};

function setSearchParams(search: string) {
  window.history.pushState({}, "", `/accounts${search}`);
}

describe("AccountInfo", () => {
  logger.debug("AccountInfo tests starting");
  beforeEach(() => {
    vi.clearAllMocks();
    setSearchParams("?id=1");
  });

  it("should return null when account is not found", () => {
    setSearchParams("?id=999");

    (useStore as any).mockImplementation(() => undefined);

    const { container } = render(<AccountInfo />);

    expect(container.firstChild).toBeNull();
  });

  it("should render account header with name and icon", () => {
    (useStore as any).mockImplementation(() => mockAccount);

    render(<AccountInfo />);

    expect(screen.getByText("My Credit Card")).toBeInTheDocument();

    expect(screen.getByTestId("square-icon")).toBeInTheDocument();
  });

  it("should render credit info section when creditInfo exists", () => {
    (useStore as any).mockImplementation(() => mockAccount);

    render(<AccountInfo />);

    expect(screen.getByText(/crédito usado/i)).toBeInTheDocument();

    expect(screen.getByText(/crédito disponible/i)).toBeInTheDocument();
  });

  it("should calculate available credit correctly", () => {
    (useStore as any).mockImplementation(() => mockAccount);

    render(<AccountInfo />);

    // Available credit = 5000 - 1200.75 = 3799.25
    const availableCredit = 5000 - 1200.75;

    expect(screen.getByText(formatNumber(availableCredit, 99999999))).toBeInTheDocument();
  });

  it("should render progress bar with correct percentage", () => {
    (useStore as any).mockImplementation(() => mockAccount);

    render(<AccountInfo />);

    const progress = screen.getByTestId("progress");

    const expectedPercentage = ((5000 - 1200.75) / 5000) * 100;

    expect(progress).toHaveStyle(`width: ${expectedPercentage}%`);
  });

  it("should not render credit section for regular accounts", () => {
    const regularAccount = { ...mockAccount, creditInfo: undefined };

    (useStore as any).mockImplementation(() => regularAccount);

    render(<AccountInfo />);

    expect(screen.queryByText(/crédito usado/i)).not.toBeInTheDocument();
  });

  it("should render AccountNextPayment for credit cards", () => {
    (useStore as any).mockImplementation(() => mockAccount);

    render(<AccountInfo />);

    expect(screen.getByTestId("next-payment")).toBeInTheDocument();
  });

  it("should not render AccountNextPayment for non-credit cards", () => {
    const regularAccount = { ...mockAccount, creditInfo: undefined };

    (useStore as any).mockImplementation(() => regularAccount);

    render(<AccountInfo />);

    expect(screen.queryByTestId("next-payment")).not.toBeInTheDocument();
  });

  it("exposes the account status", () => {
    (useStore as any).mockImplementation(() => ({ ...mockAccount, isActive: false }));
    render(<AccountInfo />);
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
  });
});
