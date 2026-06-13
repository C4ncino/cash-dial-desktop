import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

import { accountsStore } from "@/stores/accountsStore";

const mockInvoke = vi.mocked(invoke);

const accountType = {
  id: 1,
  name: "Cash",
  icon: "cash",
  color: "#00a63e",
};

const account = {
  id: 1,
  name: "Wallet",
  balance: 100,
  currencyId: 1,
  type: accountType,
  isActive: true,
};

describe("accountsStore", () => {
  beforeEach(() => {
    accountsStore.setState({
      accounts: [],
      types: [],
    });

    vi.clearAllMocks();
  });

  it("populate loads accounts and types", async () => {
    mockInvoke.mockResolvedValueOnce([accountType]).mockResolvedValueOnce([account]);

    await accountsStore.getState().populate();

    expect(accountsStore.getState().types).toEqual([accountType]);

    expect(accountsStore.getState().accounts).toEqual([account]);
  });

  it("add appends account", async () => {
    mockInvoke.mockResolvedValue(account);

    await accountsStore.getState().add(account);

    expect(accountsStore.getState().accounts).toHaveLength(1);

    expect(accountsStore.getState().accounts[0]).toEqual(account);
  });

  it("remove deletes account", async () => {
    accountsStore.setState({
      accounts: [account],
      types: [],
    });

    mockInvoke.mockResolvedValue(1);

    await accountsStore.getState().remove(1);

    expect(accountsStore.getState().accounts).toEqual([]);
  });

  it("getById returns account", () => {
    accountsStore.setState({
      accounts: [account],
      types: [],
    });

    expect(accountsStore.getState().getById(1)).toEqual(account);
  });

  it("returns undefined for missing account", () => {
    expect(accountsStore.getState().getById(999)).toBeUndefined();
  });

  it("update replaces account", async () => {
    accountsStore.setState({
      accounts: [account],
      types: [],
    });

    const updated = {
      ...account,
      name: "Updated",
    };

    mockInvoke.mockResolvedValue(updated);

    await accountsStore.getState().update(account.id, updated);

    expect(accountsStore.getState().accounts[0].name).toBe("Updated");
  });
});

import { validate } from "@/stores/accountsStore";

describe("validate", () => {
  it("accepts valid account", () => {
    const result = validate({
      name: "Cash",
      balance: "100",
      type: "1",
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("requires name", () => {
    const result = validate({
      name: "",
      balance: "100",
      type: "1",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("El nombre es requerido");
  });

  it("requires numeric balance", () => {
    const result = validate({
      name: "Cash",
      balance: "abc",
      type: "1",
    });

    expect(result.valid).toBe(false);
  });

  it("requires account type", () => {
    const result = validate({
      name: "Cash",
      balance: "100",
      type: "",
    });

    expect(result.valid).toBe(false);
  });
});

import { createAccountFromData } from "@/stores/accountsStore";

describe("createAccountFromData", () => {
  it("creates regular account", () => {
    const type = {
      id: 1,
      name: "Cash",
      icon: "cash",
      color: "#00a63e",
    };

    const account = createAccountFromData(
      {
        name: "Wallet",
        balance: "100",
        currency: "1",
        type: "1",
      },
      type,
    );

    expect(account.name).toBe("Wallet");
    expect(account.balance).toBe(100);
    expect(account.creditInfo).toBeUndefined();
  });
});
