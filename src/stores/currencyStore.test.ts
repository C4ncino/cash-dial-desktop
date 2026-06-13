import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.unmock("@/stores/currencyStore");

import { invoke } from "@tauri-apps/api/core";

import { currencyStore } from "@/stores/currencyStore";

const mockInvoke = vi.mocked(invoke);

const currency = {
  id: 1,
  name: "Peso",
  symbol: "$",
  code: "MXN",
};

describe("currencyStore", () => {
  beforeEach(() => {
    currencyStore.setState({
      currencies: [],
    });

    vi.clearAllMocks();
  });

  it("populate loads currencies", async () => {
    mockInvoke.mockResolvedValue([currency]);

    await currencyStore.getState().populate();

    expect(currencyStore.getState().currencies).toEqual([currency]);
  });

  it("getById returns currency", () => {
    currencyStore.setState({
      currencies: [currency],
    });

    expect(currencyStore.getState().getById(1)).toEqual(currency);
  });

  it("returns undefined for missing currency", () => {
    expect(currencyStore.getState().getById(999)).toBeUndefined();
  });
});
