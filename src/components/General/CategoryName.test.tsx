import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";

import CategoryName from "@/components/General/CategoryName";
import { categoryStore } from "@/stores/categoryStore";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, style }: { icon: string; style?: React.CSSProperties }) => (
    <span data-testid="category-icon" data-icon={icon} style={style} />
  ),
}));

describe("CategoryName", () => {
  it("renders the category resolved by id", () => {
    vi.mocked(useStore).mockImplementation((store: any, selector: any) =>
      store === categoryStore
        ? selector({ getById: () => ({ id: 3, name: "Food", icon: "cart", color: "red" }) })
        : undefined,
    );
    render(<CategoryName id={3} />);
    expect(screen.getByText("Food")).toBeInTheDocument();
  });

  it("uses a custom color when provided", () => {
    vi.mocked(useStore).mockImplementation((store: any, selector: any) =>
      store === categoryStore
        ? selector({ getById: () => ({ id: 3, name: "Food", icon: "cart", color: "red" }) })
        : undefined,
    );

    render(<CategoryName id={3} color="#304FFE" />);

    expect(screen.getByTestId("category-icon")).toHaveStyle({ color: "#304FFE" });
  });

  it("uses the parent category icon with a custom name for virtual categories", () => {
    vi.mocked(useStore).mockImplementation((store: any, selector: any) =>
      store === categoryStore
        ? selector({
            getById: (id: number) =>
              id === 1 ? { id: 1, name: "Food", icon: "apple", color: "green" } : undefined,
          })
        : undefined,
    );

    render(<CategoryName id={-1} parentId={1} customName="General" />);

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByTestId("category-icon")).toHaveAttribute("data-icon", "iconoir:apple");
  });

  it("uses the fallback name when the category is missing", () => {
    vi.mocked(useStore).mockImplementation((store: any, selector: any) =>
      store === categoryStore ? selector({ getById: () => undefined }) : undefined,
    );

    render(<CategoryName id={-1} fallbackName="General" />);

    expect(screen.getByText("General")).toBeInTheDocument();
  });
});
