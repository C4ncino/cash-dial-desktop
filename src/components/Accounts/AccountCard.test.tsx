import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AccountCard from "@/components/Accounts/AccountCard";

const mockAccount: Account = {
  id: 1,
  type: {
    id: 1,
    name: "Checking",
    icon: "check",
    color: "#3b82f6",
  },
  currencyId: 1,
  name: "My Checking Account",
  balance: 1500.5,
  isActive: true,
};

describe("AccountCard", () => {
  it("should render account name", () => {
    render(<AccountCard {...mockAccount} />);

    const heading = screen.getByRole("heading", { level: 2 });

    expect(heading.textContent?.replace(/\u00AD/g, "").trim()).toBe("My Checking Account");
  });

  it("should render formatted balance", () => {
    render(<AccountCard {...mockAccount} />);

    expect(screen.getByText(/1,500.50/)).toBeInTheDocument();
  });

  it("should render currency code", () => {
    render(<AccountCard {...mockAccount} />);

    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("should render SquareIcon with account type color", () => {
    render(<AccountCard {...mockAccount} />);

    const icon = screen.getByTestId("square-icon");

    expect(icon).toHaveAttribute("data-bg", "#3b82f6");

    expect(icon).toHaveAttribute("data-icon", "check");
  });

  it("should render as a link to account detail page", () => {
    render(<AccountCard {...mockAccount} />);

    const link = screen.getByRole("link");

    expect(link).toHaveAttribute("href", "/accounts?id=1");
  });

  it("should apply red text color when balance is negative", () => {
    const negativeAccount = { ...mockAccount, balance: -500 };

    const { container } = render(<AccountCard {...negativeAccount} />);

    const balanceElement = container.querySelector("strong");

    expect(balanceElement).toHaveClass("text-red-500");
  });

  it("should render account with zero balance", () => {
    const zeroAccount = { ...mockAccount, balance: 0 };

    render(<AccountCard {...zeroAccount} />);

    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it("should truncate long account names", () => {
    const longNameAccount = {
      ...mockAccount,
      name: "This is a very long account name that should be truncated",
    };

    const { container } = render(<AccountCard {...longNameAccount} />);

    const nameElement = container.querySelector("h2");

    expect(nameElement).toHaveClass("line-clamp-2");
  });
});
