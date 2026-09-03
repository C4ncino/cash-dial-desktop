import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import FormActions from "@/components/Forms/FormActions";
import FormErrors from "@/components/Forms/FormErrors";
import SegmentedControl from "@/components/Forms/SegmentedControl";
import SelectCurrency from "@/components/Forms/SelectCurrency";

vi.mock("@iconify/react", () => ({ Icon: () => <span data-testid="icon" /> }));

describe("shared form controls", () => {
  beforeEach(() => {
    vi.mocked(useStore).mockImplementation((_store: unknown, selector: (state: any) => unknown) =>
      selector({
        currencies: [
          { id: 1, symbol: "$", code: "MXN" },
          { id: 2, symbol: "€", code: "EUR" },
        ],
      }),
    );
  });

  it("renders currencies, selection, forwarded props, and changes", () => {
    const onChange = vi.fn();
    render(<SelectCurrency currencyId={2} aria-label="Currency" onChange={onChange} />);
    const select = screen.getByLabelText("Currency");
    expect(select).toHaveValue("2");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    fireEvent.change(select, { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("uses a controlled segmented selection and reports changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SegmentedControl
        items={[
          { id: 1, name: "Cash" },
          { id: 2, name: "Credit", icon: "card" },
        ]}
        value={1}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Cash")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Credit"));
    expect(onChange).toHaveBeenCalledWith(2);
    rerender(
      <SegmentedControl
        items={[
          { id: 1, name: "Cash" },
          { id: 2, name: "Credit" },
        ]}
        value={2}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Credit")).toBeChecked();
  });

  it("renders errors and disables both actions while busy", () => {
    const { rerender } = render(<FormErrors errors={[]} />);
    expect(document.querySelector(".text-red-500")).toBeNull();
    rerender(<FormErrors errors={["First", "Second"]} />);
    expect(screen.getByText("First")).toBeInTheDocument();

    render(<FormActions disabled resetLabel="Clear" submitLabel="Apply" />);
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
  });
});
