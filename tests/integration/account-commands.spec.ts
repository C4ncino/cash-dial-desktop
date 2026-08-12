import { closeTauriDriver, createDriver, deleteDatabase, invokeCommand } from "@test/driver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ACCOUNT_FUNCTIONS, MOVEMENT_FUNCTIONS } from "@/types/enums";

function expectCreditCardInfo(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      creditLimit: expect.any(Number),
      cutoffDay: expect.any(Number),
      daysToPay: expect.any(Number),
    }),
  );
}

function expectAccountType(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      icon: expect.any(String),
      color: expect.any(String),
    }),
  );
}

function expectAccount(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      currencyId: expect.any(Number),
      name: expect.any(String),
      balance: expect.any(Number),
      isActive: expect.any(Boolean),
      type: expect.any(Object),
    }),
  );

  const account = value as Account;

  expectAccountType(account.type);

  if (account.creditInfo !== null) {
    expectCreditCardInfo(account.creditInfo);
  }
}

function expectAccounts(value: unknown) {
  const accounts = value as Account[];

  expect(Array.isArray(accounts)).toBe(true);

  expect(accounts.length).toBeGreaterThan(0);

  accounts.forEach(expectAccount);
}

describe("Tauri - Account creation", () => {
  beforeAll(async () => {
    await createDriver();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  it("get_accounts returns Account[]", async () => {
    const result = await invokeCommand<unknown>(ACCOUNT_FUNCTIONS.get);

    expectAccounts(result);
  });

  it("add_account returns Account", async () => {
    const result = await invokeCommand<unknown>(ACCOUNT_FUNCTIONS.add, {
      name: "Test Account",
      balance: 100,
      typeId: 1,
      currencyId: 1,
      creditInfo: null,
    });

    expectAccount(result);

    const account = result as Account;

    expect(account.name).toBe("Test Account");
    expect(account.balance).toBe(100);
    expect(account.currencyId).toBe(1);
  });

  it("update_account returns updated Account", async () => {
    const result = await invokeCommand<unknown>(ACCOUNT_FUNCTIONS.update, {
      id: 1,
      name: "Updated Account",
      balance: 200,
      typeId: 1,
      currencyId: 1,
      creditInfo: null,
    });

    expectAccount(result);

    const account = result as Account;

    expect(account.id).toBe(1);
    expect(account.name).toBe("Updated Account");
    expect(account.balance).toBe(200);
  });

  it("get_balance returns Account balance", async () => {
    const result = await invokeCommand<unknown>(ACCOUNT_FUNCTIONS.getBalance, { id: 1 });

    console.log("Balance result:", result);

    expect(result).toEqual(expect.any(Number));
  });

  it("remove_account returns deleted rows count", async () => {
    const result = await invokeCommand<unknown>(ACCOUNT_FUNCTIONS.remove, { id: 4 });

    expect(result).toEqual(expect.any(Number));

    const deletedRows = result as number;

    expect(deletedRows).toBeGreaterThanOrEqual(0);
  });

  it("credit card accounts contain valid creditInfo schema", async () => {
    const result = await invokeCommand<unknown>(ACCOUNT_FUNCTIONS.get);

    expectAccounts(result);

    const accounts = result as Account[];

    const creditCard = accounts.find((account) => account.creditInfo !== null);

    expect(creditCard).toBeDefined();

    if (!creditCard) return new Error("No credit card account found for testing.");

    expect(creditCard.creditInfo).toEqual(
      expect.objectContaining({
        creditLimit: expect.any(Number),
        cutoffDay: expect.any(Number),
        daysToPay: expect.any(Number),
      }),
    );
  });

  it("get_credit_cards_next_payment returns next payment info for credit card", async () => {
    const result = await invokeCommand<unknown>(ACCOUNT_FUNCTIONS.getNextPayment, {
      accountId: 3,
    });

    expect(result).toEqual(
      expect.objectContaining({
        accountId: 3,
        paymentDate: expect.any(Number),
        totalAmount: expect.any(Number),
        movements: expect.any(Array),
      }),
    );

    const nextPayment = result as CreditCardNextPayment;
    expect(nextPayment.totalAmount).toBeGreaterThan(0);
    expect(nextPayment.movements.length).toBeGreaterThan(0);

    const firstMov = nextPayment.movements[0];
    expect(firstMov).toEqual(
      expect.objectContaining({
        movementId: expect.any(Number),
        installmentIds: expect.any(Array),
        amount: expect.any(Number),
      }),
    );
  });

  it("get_credit_cards_next_payment throws error for non-credit card account", async () => {
    await expect(
      invokeCommand(ACCOUNT_FUNCTIONS.getNextPayment, {
        accountId: 2, // Account 2 is debit, not credit
      }),
    ).rejects.toThrow();
  });

  it("pay_credit_card updates balances and creates transfer movement successfully", async () => {
    // 1. Get initial state
    const initialDebitBalance = await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 2 });
    const initialCreditBalance = await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 3 });
    const initialMovements = await invokeCommand<any[]>(MOVEMENT_FUNCTIONS.get);

    // 2. Perform payment
    const paymentAmount = 50;
    const payments: CreditCardPaymentRequest[] = [
      { fromAccountId: 2, amount: paymentAmount },
    ];

    const transferMovementIds = await invokeCommand<number[]>(ACCOUNT_FUNCTIONS.payCreditCard, {
      creditAccountId: 3,
      payments,
    });

    // 3. Verify updated balances
    const newDebitBalance = await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 2 });
    const newCreditBalance = await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 3 });

    expect(newDebitBalance).toBe(initialDebitBalance - paymentAmount);
    expect(newCreditBalance).toBe(initialCreditBalance + paymentAmount);
    expect(transferMovementIds).toHaveLength(1);
    expect(transferMovementIds[0]).toEqual(expect.any(Number));
    expect(transferMovementIds[0]).toBeGreaterThan(0);

    // 4. Verify a transfer movement was created
    const newMovements = await invokeCommand<any[]>(MOVEMENT_FUNCTIONS.get);
    expect(newMovements.length).toBe(initialMovements.length + 1);

    const createdMovement = newMovements.find(
      (m) =>
        m.typeId === 3 && // TRANSFER
        m.accountId === 2 && // fromAccountId
        m.toAccountId === 3 && // creditAccountId
        m.originalAmount === paymentAmount
    );
    expect(createdMovement).toBeDefined();
    expect(createdMovement.description).toContain("Pago de tarjeta");
    expect(createdMovement.id).toBe(transferMovementIds[0]);
  });

  it("pay_credit_card throws error on invalid parameters", async () => {
    // Case A: Nonexistent credit card account
    await expect(
      invokeCommand(ACCOUNT_FUNCTIONS.payCreditCard, {
        creditAccountId: 9999,
        payments: [{ fromAccountId: 2, amount: 50.0 }],
      }),
    ).rejects.toThrow();

    // Case B: Non-credit card destination account
    await expect(
      invokeCommand(ACCOUNT_FUNCTIONS.payCreditCard, {
        creditAccountId: 2, // debit account
        payments: [{ fromAccountId: 1, amount: 50.0 }],
      }),
    ).rejects.toThrow();

    // Case C: Invalid payment amount (zero or negative)
    await expect(
      invokeCommand(ACCOUNT_FUNCTIONS.payCreditCard, {
        creditAccountId: 3,
        payments: [{ fromAccountId: 2, amount: 0.0 }],
      }),
    ).rejects.toThrow();

    await expect(
      invokeCommand(ACCOUNT_FUNCTIONS.payCreditCard, {
        creditAccountId: 3,
        payments: [{ fromAccountId: 2, amount: -10.0 }],
      }),
    ).rejects.toThrow();

    // Case D: Nonexistent source account
    await expect(
      invokeCommand(ACCOUNT_FUNCTIONS.payCreditCard, {
        creditAccountId: 3,
        payments: [{ fromAccountId: 9999, amount: 50.0 }],
      }),
    ).rejects.toThrow();
  });
});

