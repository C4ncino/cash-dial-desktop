import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";

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
    logger.debug("Resetting accountsStore state for test");
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

  it("updateBalance updates balance for single account and returns it", async () => {
    accountsStore.setState({
      accounts: [account],
      types: [],
    });

    mockInvoke.mockResolvedValueOnce(150);

    const balance = await accountsStore.getState().updateBalance(account.id);

    expect(balance).toBe(150);
    expect(accountsStore.getState().accounts[0].balance).toBe(150);
  });

  it("updateBalance updates balance for two accounts and returns array", async () => {
    const account2 = { ...account, id: 2, balance: 200 };
    accountsStore.setState({
      accounts: [account, account2],
      types: [],
    });

    mockInvoke.mockResolvedValueOnce(300).mockResolvedValueOnce(400);

    const balances = await accountsStore.getState().updateBalance(account.id, account2.id);

    expect(balances).toEqual([300, 400]);
    expect(accountsStore.getState().accounts[0].balance).toBe(300);
    expect(accountsStore.getState().accounts[1].balance).toBe(400);
  });

  it("getNextPayment returns next payment data", async () => {
    const nextPayment = { accountId: 1, totalAmount: 100, paymentDate: 123, movements: [] };
    mockInvoke.mockResolvedValueOnce(nextPayment);

    const result = await accountsStore.getState().getNextPayment(1);

    expect(result).toEqual(nextPayment);
    expect(mockInvoke).toHaveBeenCalledWith("get_credit_cards_next_payment", { accountId: 1 });
  });

  it("getNextPayment handles error", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Failed"));

    await expect(accountsStore.getState().getNextPayment(1)).rejects.toThrow("Failed");
  });

  it("payCreditCard invokes Tauri command and populates store", async () => {
    const payments = [{ fromAccountId: 2, amount: 50.0 }];
    mockInvoke
      .mockResolvedValueOnce([42])
      .mockResolvedValueOnce([accountType])
      .mockResolvedValueOnce([account]);

    const transferMovementIds = await accountsStore.getState().payCreditCard(1, payments);

    expect(transferMovementIds).toEqual([42]);
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "pay_credit_card", {
      creditAccountId: 1,
      payments,
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "get_account_types");
    expect(mockInvoke).toHaveBeenNthCalledWith(3, "get_accounts");
  });

  it("payCreditCard handles error and propagates it", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Payment Failed"));

    await expect(
      accountsStore.getState().payCreditCard(1, [{ fromAccountId: 2, amount: 50 }])
    ).rejects.toThrow("Payment Failed");
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
