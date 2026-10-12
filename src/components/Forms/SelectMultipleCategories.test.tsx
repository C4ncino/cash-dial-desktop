import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import SelectMultipleCategories from "@/components/Forms/SelectMultipleCategories";
import { categoryStore } from "@/stores/categoryStore";

vi.mock("zustand");
vi.mock("@iconify/react", () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) => (
    <span data-testid="icon" data-icon={icon} className={className} />
  ),
}));

const categories: Category[] = [
  { id: 1, fatherId: null, name: "Food", icon: "apple", color: "#00a63e" },
  { id: 2, fatherId: 1, name: "Groceries", icon: "cart", color: "#00a63e" },
  { id: 3, fatherId: null, name: "Transport", icon: "car", color: "#2563eb" },
];

let activeCategories = categories;

const mockCategoryStore = () => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store !== categoryStore) return undefined;
    return selector({
      categories: activeCategories,
      getById: (id: number) => activeCategories.find((category) => category.id === id),
    });
  });
};

describe("SelectMultipleCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeCategories = categories;
    mockCategoryStore();
  });

  it("selects and deselects leaves without closing the options", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SelectMultipleCategories categoryIds={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));
    fireEvent.click(screen.getByRole("button", { name: "Expandir Food" }));
    const groceries = screen.getByRole("button", { name: /Groceries/ });
    fireEvent.click(groceries);

    expect(onChange).toHaveBeenLastCalledWith([2]);
    expect(screen.getByRole("list", { name: "Opciones de categoría" })).toBeInTheDocument();

    rerender(<SelectMultipleCategories categoryIds={[2]} onChange={onChange} />);
    expect(
      within(screen.getByRole("list", { name: "Opciones de categoría" })).getByRole("button", {
        name: /Groceries/,
      }),
    ).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(
      within(screen.getByRole("list", { name: "Opciones de categoría" })).getByRole("button", {
        name: /Groceries/,
      }),
    );
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("submits one categoryIds field for every selected category", () => {
    const FormHarness = () => {
      const [categoryIds, setCategoryIds] = useState<number[]>([]);
      const [submitted, setSubmitted] = useState<string[]>([]);
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(new FormData(event.currentTarget).getAll("categoryIds").map(String));
          }}
        >
          <SelectMultipleCategories categoryIds={categoryIds} onChange={setCategoryIds} />
          <button type="submit">Submit</button>
          <output>{submitted.join(",")}</output>
        </form>
      );
    };

    render(<FormHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));
    fireEvent.click(screen.getByRole("button", { name: "Expandir Food" }));
    fireEvent.click(screen.getByRole("button", { name: /General/ }));
    fireEvent.click(screen.getByRole("button", { name: /Transport/ }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByText("1,3")).toBeInTheDocument();
  });

  it("submits no categoryIds values when nothing is selected", () => {
    render(
      <form aria-label="Category form">
        <SelectMultipleCategories categoryIds={[]} onChange={vi.fn()} />
      </form>,
    );
    const form = screen.getByRole("form", { name: "Category form" });

    expect(new FormData(form as HTMLFormElement).getAll("categoryIds")).toEqual([]);
  });

  it("clears the display and form values when the controlled selection is reset", () => {
    const { container, rerender } = render(
      <form>
        <SelectMultipleCategories categoryIds={[2, 3]} onChange={vi.fn()} />
      </form>,
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    rerender(
      <form>
        <SelectMultipleCategories categoryIds={[]} onChange={vi.fn()} />
      </form>,
    );

    expect(screen.getByText("Seleccionar categorías")).toBeInTheDocument();
    expect(container.querySelectorAll('input[name="categoryIds"]')).toHaveLength(0);
  });

  it("limits available choices to the requested category subtree", () => {
    render(<SelectMultipleCategories categoryIds={[]} onChange={vi.fn()} rootCategoryId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.queryByText("Transport")).not.toBeInTheDocument();
  });

  it("expands and collapses parent categories", () => {
    render(<SelectMultipleCategories categoryIds={[]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));

    const expand = screen.getByRole("button", { name: "Expandir Food" });
    fireEvent.click(expand);
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Contraer Food" }));
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
  });

  it("shows an empty state when categories are unavailable", () => {
    activeCategories = [];
    mockCategoryStore();

    render(<SelectMultipleCategories categoryIds={[]} onChange={vi.fn()} />);

    expect(screen.getByText("No hay categorías disponibles.")).toBeInTheDocument();
  });

  it("closes the options when clicking outside the control", () => {
    render(
      <>
        <SelectMultipleCategories categoryIds={[]} onChange={vi.fn()} />
        <button type="button">Outside</button>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar categorías" }));
    expect(screen.getByRole("list", { name: "Opciones de categoría" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("list", { name: "Opciones de categoría" })).not.toBeInTheDocument();
  });

  it("closes the options and restores focus when Escape is pressed", () => {
    render(<SelectMultipleCategories categoryIds={[]} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Seleccionar categorías" });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "Escape" });

    expect(screen.queryByRole("list", { name: "Opciones de categoría" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
