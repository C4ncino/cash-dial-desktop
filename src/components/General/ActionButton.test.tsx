import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ActionButton from "@/components/General/ActionButton";
import type { ActionButtonTone } from "@/components/General/actionButtonStyles";

describe("ActionButton", () => {
  it.each([
    ["default", "border-zinc-400"],
    ["primary", "bg-green-600"],
    ["success", "border-emerald-600"],
    ["warning", "border-amber-600"],
    ["danger", "border-red-600"],
    ["info", "border-blue-600"],
  ] as const)("renders the %s tone", (tone, expectedClass) => {
    render(<ActionButton tone={tone as ActionButtonTone}>{tone}</ActionButton>);

    expect(screen.getByRole("button", { name: tone })).toHaveClass(
      "focus-ring",
      "min-h-11",
      "rounded-lg",
      "border-2",
      expectedClass,
    );
  });

  it("defaults to a native button and content width", () => {
    render(<ActionButton>Default action</ActionButton>);

    expect(screen.getByRole("button", { name: "Default action" })).toHaveAttribute(
      "type",
      "button",
    );
    expect(screen.getByRole("button", { name: "Default action" })).toHaveClass("w-auto");
  });

  it("forwards attributes and supports contextual full width", () => {
    render(
      <ActionButton fullWidth disabled aria-label="Busy action" data-state="busy">
        Saving
      </ActionButton>,
    );

    const button = screen.getByRole("button", { name: "Busy action" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-state", "busy");
    expect(button).toHaveClass("w-full", "disabled:opacity-50");
  });

  it("merges caller layout overrides", () => {
    render(<ActionButton className="w-1/2">Custom width</ActionButton>);

    const button = screen.getByRole("button", { name: "Custom width" });
    expect(button).toHaveClass("w-1/2");
    expect(button).not.toHaveClass("w-auto");
  });
});
