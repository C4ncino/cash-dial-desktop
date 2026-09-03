import { beforeEach, describe, expect, it } from "vitest";

import { NavbarMenu } from "@/lib/menu";

describe("NavbarMenu", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("toggles the link layout and both menu icons", () => {
    document.body.innerHTML = `
      <button id="menu"><span></span><span class="hidden"></span></button>
      <ul id="links" class="hidden"></ul>`;
    new NavbarMenu();
    document.getElementById("menu")?.click();
    expect(document.getElementById("links")).toHaveClass("flex");
    expect(document.getElementById("links")).not.toHaveClass("hidden");
    expect(document.querySelectorAll("#menu .hidden")).toHaveLength(1);
  });

  it("is safe when navbar elements are absent", () => {
    expect(() => new NavbarMenu().toggle()).not.toThrow();
  });
});
