import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AddButton from "@/components/General/AddButton";

describe("AddButton", () => {
  it("renders a plus icon and forwards button attributes", () => {
    render(<AddButton id="create-item-button">Añadir elemento</AddButton>);

    const button = screen.getByRole("button", { name: "Añadir elemento" });
    expect(button).toHaveAttribute("id", "create-item-button");
    expect(button).toHaveAttribute("type", "button");
    expect(button.querySelector('[data-icon="iconoir:plus"]')).toBeInTheDocument();
  });
});
