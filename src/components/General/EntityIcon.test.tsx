import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.unmock("@/components/General/EntityIcon");

import EntityIcon from "@/components/General/EntityIcon";

vi.mock("@iconify/react", () => ({
  Icon: ({ icon, className }: React.ComponentProps<"span"> & { icon: string }) => (
    <span data-testid="entity-icon" data-icon={icon} className={className} />
  ),
}));

describe("EntityIcon", () => {
  it.each(["data-transfer-up", "iconoir:data-transfer-up"])(
    "rotates the transfer icon provided as %s",
    (icon) => {
      render(<EntityIcon icon={icon} color="#2563eb" />);

      expect(screen.getByTestId("entity-icon")).toHaveClass("rotate-90");
    },
  );

  it("does not rotate other icons", () => {
    render(<EntityIcon icon="cart" color="#2563eb" />);

    expect(screen.getByTestId("entity-icon")).not.toHaveClass("rotate-90");
  });
});
