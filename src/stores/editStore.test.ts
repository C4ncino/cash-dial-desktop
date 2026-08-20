import { describe, expect, it } from "vitest";

import { editStore } from "@/stores/editStore";

describe("editStore", () => {
  it("sets edit state", () => {
    editStore.getState().setId(10, "ACCOUNT");

    expect(editStore.getState().id).toBe(10);
    expect(editStore.getState().type).toBe("ACCOUNT");
  });

  it("clears edit state", () => {
    editStore.getState().setId(10, "ACCOUNT");

    editStore.getState().clear();

    expect(editStore.getState().id).toBeNull();
    expect(editStore.getState().type).toBeNull();
  });
});
