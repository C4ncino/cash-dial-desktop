import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AmountText from "@/components/General/AmountText";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}));

const currency = { id: 1, name: "Peso", code: "MXN", symbol: "$" } as Currency;

describe("AmountText", () => {
  it("uses neutral defaults without an icon", () => {
    render(<AmountText amount={1250} />);
    expect(screen.getByText("1,250")).toBeInTheDocument();
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });

  it("renders the selected tone and icon", () => {
    render(<AmountText amount={75} tone="expense" icon="minus" />);
    expect(screen.getByText("75.00")).toHaveClass("font-semibold");
    expect(screen.getByTestId("icon")).toHaveAttribute("data-icon", "iconoir:minus");
  });

  it("supports short and currency formatting", () => {
    render(<AmountText amount={1250} format="short" tone="income" icon="plus" />);
    expect(screen.getByText("1K")).toBeInTheDocument();

    const { getByText } = render(<AmountText amount={75} format="currency" currency={currency} />);
    expect(getByText("MX$75.00")).toBeInTheDocument();
  });

  it("supports inline currency rendering", () => {
    render(<AmountText amount={150.5} currency={currency} format="currency" inline className="text-xl" />);

    const amount = screen.getByText("MX$150.50");
    expect(amount.tagName).toBe("STRONG");
    expect(amount).toHaveClass("text-xl");
  });
});
