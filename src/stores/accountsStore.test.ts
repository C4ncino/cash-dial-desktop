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
    const payments = [{ fromAccountId: 2, originalAmount: 45, accountAmount: 50 }];
    const paymentResult = { transferMovementIds: [42], paidMovementIds: [7] };
    mockInvoke
      .mockResolvedValueOnce(paymentResult)
      .mockResolvedValueOnce([accountType])
      .mockResolvedValueOnce([account]);

    const result = await accountsStore.getState().payCreditCard(1, payments, [101]);

    expect(result).toEqual(paymentResult);
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "pay_credit_card", {
      creditAccountId: 1,
      payments,
      installmentIds: [101],
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "get_account_types");
    expect(mockInvoke).toHaveBeenNthCalledWith(3, "get_accounts");
  });

  it("payCreditCard handles error and propagates it", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Payment Failed"));

    await expect(
      accountsStore
        .getState()
        .payCreditCard(1, [{ fromAccountId: 2, originalAmount: 45, accountAmount: 50 }], [101]),
    ).rejects.toThrow("Payment Failed");
  });

  it("keeps account state unchanged when add, update, or remove fails", async () => {
    accountsStore.setState({ accounts: [account], types: [accountType] });
    const before = accountsStore.getState().accounts;
    for (const mutation of [
      () => accountsStore.getState().add(account),
      () => accountsStore.getState().update(account.id, account),
      () => accountsStore.getState().remove(account.id),
    ]) {
      mockInvoke.mockRejectedValueOnce(new Error("mutation failed"));
      await expect(mutation()).rejects.toThrow("mutation failed");
      expect(accountsStore.getState().accounts).toEqual(before);
    }
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

  const validCreditAccount = {
    name: "Visa",
    balance: "0",
    type: "3",
    creditLimit: "1000",
    cutoffDay: "15",
    daysToPay: "20",
  };

  it("accepts valid credit-account boundary values", () => {
    expect(validate({ ...validCreditAccount, cutoffDay: "1", daysToPay: "1" }).valid).toBe(true);
    expect(validate({ ...validCreditAccount, cutoffDay: "31", daysToPay: "30" }).valid).toBe(true);
  });

  it.each([
    ["creditLimit", "", "El límite de crédito es requerido"],
    ["creditLimit", "Infinity", "El límite de crédito es requerido"],
    ["creditLimit", "0", "El límite de crédito debe ser mayor a 0"],
    ["cutoffDay", "0", "El día de corte debe ser un número entre 1 y 31"],
    ["cutoffDay", "32", "El día de corte debe ser un número entre 1 y 31"],
    ["cutoffDay", "1.5", "El día de corte es requerido"],
    ["daysToPay", "0", "El día de pago debe ser un número entre 1 y 30"],
    ["daysToPay", "31", "El día de pago debe ser un número entre 1 y 30"],
    ["daysToPay", "1.5", "El día de pago es requerido"],
    ["balance", "-1", "El saldo usado debe ser mayor o igual a 0"],
  ])("rejects invalid credit field %s=%s", (field, value, message) => {
    const result = validate({ ...validCreditAccount, [field]: value });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(message);
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
