import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MovementLabel from "@/components/General/MovementLabel";

vi.mock("@/hooks/useStores", () => ({
  useCategories: (selector: (state: unknown) => unknown) =>
    selector({
      categories: [{ id: 4, name: "Food", icon: "pizza-slice", color: "#ff0000" }],
    }),
}));

describe("MovementLabel", () => {
  it("shows the movement description with its category icon", () => {
    render(<MovementLabel categoryId={4} description="Weekly groceries" />);

    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
    expect(screen.getByTestId("square-icon")).toBeInTheDocument();
  });

  it.each([undefined, null, "", "   "])("uses the category name when description is empty", (description) => {
    render(<MovementLabel categoryId={4} description={description} />);

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByTestId("square-icon")).toBeInTheDocument();
  });
});
