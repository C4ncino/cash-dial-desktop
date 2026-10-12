import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MovementLabel from "@/components/General/MovementLabel";

vi.mock("@/hooks/useStores", () => ({
  useCategories: (selector: (state: unknown) => unknown) =>
    selector({
      categories: [{ id: 4, name: "Food", icon: "pizza-slice", color: "#ff0000" }],
    }),
}));
vi.mock("@iconify/react", () => ({
  Icon: ({ icon, style, className }: { icon: string; style?: React.CSSProperties; className?: string }) => (
    <span data-testid="category-icon" data-icon={icon} style={style} className={className} />
  ),
}));

describe("MovementLabel", () => {
  it("shows the movement description with its category icon", () => {
    render(<MovementLabel categoryId={4} description="Weekly groceries" />);

    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
    expect(screen.getByTestId("category-icon")).toHaveAttribute("data-icon", "iconoir:pizza-slice");
  });

  it.each([undefined, null, "", "   "])("uses the category name when description is empty", (description) => {
    render(<MovementLabel categoryId={4} description={description} />);

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByTestId("category-icon")).toHaveAttribute("data-icon", "iconoir:pizza-slice");
  });
});
