import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AccountCard from "@/components/Accounts/AccountCard";
import { logger } from "@/lib/logger";

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

logger.debug("AccountCard tests starting");

describe("AccountCard", () => {
  it("should render the account summary and detail link", () => {
    render(<AccountCard {...mockAccount} />);

    const heading = screen.getByRole("heading", { level: 3 });

    expect(heading.textContent?.replace(/\u00AD/g, "").trim()).toBe("My Checking Account");
    expect(screen.getByText(/1,500.50/)).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    const icon = screen.getByTestId("square-icon");
    expect(icon).toHaveAttribute("data-bg", "#3b82f6");
    expect(icon).toHaveAttribute("data-icon", "check");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/account?id=1");
    expect(link).toHaveAttribute("href", "/account?id=1");
  });

  it("should apply red text color when balance is negative", () => {
    const negativeAccount = { ...mockAccount, balance: -500 };

    const { container } = render(<AccountCard {...negativeAccount} />);

    const balanceElement = container.querySelector("strong");

    expect(balanceElement).toHaveClass("text-red-600", "dark:text-red-400");
  });

  it("should render zero balance without applying expense styling", () => {
    render(<AccountCard {...mockAccount} balance={0} />);

    expect(screen.getByText(/0/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("marks inactive accounts visibly", () => {
    render(<AccountCard {...mockAccount} isActive={false} />);

    expect(screen.getByText("Inactiva")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveClass("opacity-70");
  });
});
