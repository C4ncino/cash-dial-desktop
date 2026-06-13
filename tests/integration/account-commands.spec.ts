import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { createDriver, closeTauriDriver, deleteDatabase, seedDatabase, invokeCommand } from "@test/driver";
import { ACCOUNT_FUNCTIONS } from "@/types/enums";


export function expectCreditCardInfo(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      creditLimit: expect.any(Number),
      cutoffDay: expect.any(Number),
      daysToPay: expect.any(Number),
    }),
  );
}

export function expectAccountType(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      icon: expect.any(String),
      color: expect.any(String),
    }),
  );
}

export function expectAccount(value: unknown) {
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

export function expectAccounts(value: unknown) {
  expect(Array.isArray(value)).toBe(true);

  (value as unknown[]).forEach(expectAccount);
}


describe("Tauri - Account creation", () => {
  beforeAll(async () => {
    await createDriver();
    seedDatabase();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  it("get_accounts returns Account[]", async () => {
    const result = await invokeCommand<unknown>(
      ACCOUNT_FUNCTIONS.get,
    );

    expectAccounts(result);
  });

  it("add_account returns Account", async () => {
    const result = await invokeCommand<unknown>(
      ACCOUNT_FUNCTIONS.add,
      {
        name: "Test Account",
        balance: 100,
        typeId: 1,
        currencyId: 1,
        creditInfo: null,
      },
    );

    expectAccount(result);

    const account = result as Account;

    expect(account.name).toBe("Test Account");
    expect(account.balance).toBe(100);
    expect(account.currencyId).toBe(1);
  });

  it("update_account returns updated Account", async () => {
    const result = await invokeCommand<unknown>(
      ACCOUNT_FUNCTIONS.update,
      {
        id: 1,
        name: "Updated Account",
        balance: 200,
        typeId: 1,
        currencyId: 1,
        creditInfo: null,
      },
    );

    expectAccount(result);

    const account = result as Account;

    expect(account.id).toBe(1);
    expect(account.name).toBe("Updated Account");
    expect(account.balance).toBe(200);
  });

  it("remove_account returns deleted rows count", async () => {
    const result = await invokeCommand<unknown>(
      ACCOUNT_FUNCTIONS.remove,
      {
        id: 1,
      },
    );

    expect(result).toEqual(expect.any(Number));

    const deletedRows = result as number;

    expect(deletedRows).toBeGreaterThanOrEqual(0);
  });

  it("credit card accounts contain valid creditInfo schema", async () => {
    const result = await invokeCommand<unknown>(
      ACCOUNT_FUNCTIONS.get,
    );

    expectAccounts(result);

    const accounts = result as Account[];

    const creditCard = accounts.find(
      (account) => account.creditInfo !== null,
    );

    expect(creditCard).toBeDefined();

    expect(creditCard!.creditInfo).toEqual(
      expect.objectContaining({
        creditLimit: expect.any(Number),
        cutoffDay: expect.any(Number),
        daysToPay: expect.any(Number),
      }),
    );
  });
});
