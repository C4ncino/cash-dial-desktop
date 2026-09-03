import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import SelectCategories from "@/components/Forms/SelectCategories";
import { categoryStore } from "@/stores/categoryStore";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid="icon" data-icon={icon} />,
}));

vi.mock("webcoreui/react", () => ({
  Breadcrumb: ({ items }: { items: { label?: string }[] }) => (
    <p data-testid="breadcrumb">{items.map((item) => item.label).join(" / ")}</p>
  ),
}));

const mockCategories = [
  {
    id: 1,
    key: "food",
    fatherId: null,
    name: "Food",
    icon: "apple",
    color: "#00a63e",
  },
  {
    id: 2,
    key: "groceries",
    fatherId: 1,
    name: "Groceries",
    icon: "cart",
    color: "#00a63e",
  },
];

const mockGetById = vi.fn((id: number) => mockCategories[id - 1]);

const mockUseStoreState = ({ categories = mockCategories } = {}) => {
  vi.mocked(useStore).mockImplementation((store: any, selector: any) => {
    if (store === categoryStore) {
      return selector({
        categories,
        getById: mockGetById,
      });
    }
    return undefined;
  });
};

describe("SelectCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStoreState();
  });

  it("should render selection placeholder when categoryId is not provided", () => {
    render(<SelectCategories />);
    expect(screen.getByText("Seleccionar Categoría")).toBeInTheDocument();
  });

  it("should render selected category name when categoryId is provided", () => {
    render(<SelectCategories categoryId={2} />);
    expect(screen.getByText("Food / Groceries")).toBeInTheDocument();
  });

  it("should toggle dropdown list visibility when trigger button is clicked", () => {
    render(<SelectCategories />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    const selectButton = screen.getByRole("button");
    fireEvent.click(selectButton);

    expect(screen.getByRole("list")).toBeInTheDocument();

    fireEvent.click(selectButton);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("should show father categories and display subcategories when father category is clicked", () => {
    render(<SelectCategories />);

    const selectButton = screen.getByRole("button");
    fireEvent.click(selectButton);

    const parentItem = screen.getByText("Food");
    expect(parentItem).toBeInTheDocument();

    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();

    fireEvent.click(parentItem);

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId("icon")
        .some((icon) => icon.getAttribute("data-icon") === "iconoir:apple"),
    ).toBe(true);

    fireEvent.click(parentItem);
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
  });

  it("should invoke onChange callback and close dropdown when subcategory is clicked", () => {
    const mockOnChange = vi.fn();
    render(<SelectCategories onChange={mockOnChange} />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Food"));

    const subcategoryItem = screen.getByText("Groceries");
    fireEvent.click(subcategoryItem);

    expect(mockOnChange).toHaveBeenCalledWith(2);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
  it("should submit the selected category in the form data", () => {
    let formData: FormData | undefined;

    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          formData = new FormData(e.currentTarget);
        }}
      >
        <SelectCategories />
        <button type="submit">Submit</button>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar Categoría" }));
    fireEvent.click(screen.getByText("Food"));
    fireEvent.click(screen.getByText("Groceries"));

    fireEvent.click(screen.getByText("Submit"));

    expect(formData).toBeDefined();
    expect(formData?.get("categoryId")).toBe("2");
  });

  it("should restrict category options to rootCategoryId subtree when rootCategoryId is provided", () => {
    const categoriesWithTransport = [
      ...mockCategories,
      {
        id: 3,
        key: "transport",
        fatherId: null,
        name: "Transport",
        icon: "car",
        color: "#3b82f6",
      },
    ];
    mockUseStoreState({ categories: categoriesWithTransport });

    render(<SelectCategories rootCategoryId={1} />);

    const selectButton = screen.getByRole("button");
    fireEvent.click(selectButton);

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.queryByText("Transport")).not.toBeInTheDocument();
  });

  it("should reset invalid selected category when rootCategoryId changes to an incompatible category", () => {
    const mockOnChange = vi.fn();
    const categoriesWithTransport = [
      ...mockCategories,
      {
        id: 3,
        key: "transport",
        fatherId: null,
        name: "Transport",
        icon: "car",
        color: "#3b82f6",
      },
    ];
    mockUseStoreState({ categories: categoriesWithTransport });

    const { rerender } = render(
      <SelectCategories categoryId={3} rootCategoryId={undefined} onChange={mockOnChange} />,
    );

    // Now set rootCategoryId to 1 (Food) which does not contain category 3 (Transport)
    rerender(<SelectCategories categoryId={3} rootCategoryId={1} onChange={mockOnChange} />);

    expect(screen.getByText("Seleccionar Categoría")).toBeInTheDocument();
  });
});
