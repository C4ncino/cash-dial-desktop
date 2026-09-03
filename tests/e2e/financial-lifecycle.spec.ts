import {
  closeTauriDriver,
  createDriver,
  driver,
  invokeCommand,
  navigateTo,
  waitForBodyText,
  waitForHomeReady,
} from "@test/driver";
import { By } from "selenium-webdriver";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ACCOUNT_FUNCTIONS,
  BUDGET_FUNCTIONS,
  MOVEMENT_FUNCTIONS,
  PLANNING_FUNCTIONS,
} from "@/types/enums";

const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
const nextMonthStart = () =>
  new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime();

const movementRequest = (overrides: Record<string, unknown> = {}) => ({
  typeId: 2,
  accountId: 1,
  toAccountId: null,
  categoryId: 13,
  currencyId: 1,
  originalAmount: 45,
  accountAmount: 45,
  installments: null,
  timestamp: Date.now(),
  description: "E2E lifecycle expense",
  ...overrides,
});

describe("Financial lifecycle E2E", () => {
  beforeEach(async () => {
    await createDriver({ freshDatabase: true });
    await waitForHomeReady();
  });

  afterEach(async () => {
    await closeTauriDriver();
  });

  it("persists an account edit after an application reload", async () => {
    const account = (await invokeCommand<Account[]>(ACCOUNT_FUNCTIONS.get)).find(
      (item) => item.id === 1,
    );
    if (!account) throw new Error("Seeded account 1 was not found");
    await invokeCommand(ACCOUNT_FUNCTIONS.update, {
      id: account.id,
      name: "Reloaded Wallet",
      balance: account.balance,
      typeId: account.type.id,
      currencyId: account.currencyId,
      creditInfo: null,
    });

    await driver.navigate().refresh();
    await waitForHomeReady();
    const text = (await waitForBodyText("Reloaded Wallet")).replaceAll("\u00ad", "").toLowerCase();
    expect(text).toContain("reloaded wallet");
  });

  it("creates a credit card and renders its persisted credit details", async () => {
    const card = await invokeCommand<Account>(ACCOUNT_FUNCTIONS.add, {
      name: "E2E Platinum",
      balance: 0,
      typeId: 3,
      currencyId: 1,
      creditInfo: { creditLimit: 4321, cutoffDay: 17, daysToPay: 23 },
    });

    await navigateTo(`/account?id=${card.id}`, By.css("main"));
    const text = await waitForBodyText("E2E Platinum");
    expect(text).toContain("E2E Platinum");
    expect(text).toMatch(/4[,.]?321/);
    expect(text).toMatch(/dito disponible/);
  });

  it("runs an income create-update-delete lifecycle and restores balance", async () => {
    const initialBalance = await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 1 });
    const created = await invokeCommand<Movement>(
      MOVEMENT_FUNCTIONS.add,
      movementRequest({
        typeId: 1,
        categoryId: 1,
        originalAmount: 125,
        accountAmount: 125,
        description: "E2E lifecycle income",
      }),
    );
    expect(await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 1 })).toBe(
      initialBalance + 125,
    );

    await driver.navigate().refresh();
    await waitForHomeReady();
    expect(
      (await invokeCommand<Movement>(MOVEMENT_FUNCTIONS.getById, { movementId: created.id }))
        .description,
    ).toBe("E2E lifecycle income");
    await invokeCommand(MOVEMENT_FUNCTIONS.update, {
      ...movementRequest({
        id: created.id,
        typeId: 1,
        categoryId: 1,
        originalAmount: 150,
        accountAmount: 150,
        description: "E2E updated income",
      }),
    });
    await driver.navigate().refresh();
    await waitForHomeReady();
    expect(
      (await invokeCommand<Movement>(MOVEMENT_FUNCTIONS.getById, { movementId: created.id }))
        .description,
    ).toBe("E2E updated income");
    await invokeCommand(MOVEMENT_FUNCTIONS.remove, { id: created.id });
    expect(await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 1 })).toBe(
      initialBalance,
    );
  });

  it("persists a credit-card purchase and its exact installment schedule", async () => {
    const purchase = await invokeCommand<Movement>(
      MOVEMENT_FUNCTIONS.add,
      movementRequest({
        accountId: 3,
        originalAmount: 100,
        accountAmount: 100,
        installments: 3,
        description: "E2E installment purchase",
      }),
    );
    const installments = await invokeCommand<MovementInstallment[]>(
      MOVEMENT_FUNCTIONS.getInstallments,
      { movementId: purchase.id },
    );
    expect(installments.map((item) => item.amount)).toEqual([33.33, 33.33, 33.34]);

    await driver.navigate().refresh();
    await driver.navigate().refresh();
    await waitForHomeReady();
    const persisted = await invokeCommand<Movement>(MOVEMENT_FUNCTIONS.getById, {
      movementId: purchase.id,
    });
    expect(persisted.description).toBe("E2E installment purchase");
    expect(persisted.installments).toBe(3);
  });

  it("pays the next statement atomically from two source accounts", async () => {
    const next = await invokeCommand<CreditCardNextPayment>(ACCOUNT_FUNCTIONS.getNextPayment, {
      accountId: 3,
    });
    const firstAmount = Math.min(100, next.totalAmount / 2);
    const secondAmount = next.totalAmount - firstAmount;
    const firstBefore = await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 1 });
    const secondBefore = await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 2 });
    const result = await invokeCommand<CreditCardPaymentResult>(ACCOUNT_FUNCTIONS.payCreditCard, {
      creditAccountId: 3,
      payments: [
        { fromAccountId: 1, originalAmount: firstAmount, accountAmount: firstAmount },
        { fromAccountId: 2, originalAmount: secondAmount, accountAmount: secondAmount },
      ],
      installmentIds: next.movements.flatMap((item) => item.installmentIds),
    });

    expect(result.transferMovementIds).toHaveLength(2);
    expect(await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 1 })).toBeCloseTo(
      firstBefore - firstAmount,
      2,
    );
    expect(await invokeCommand<number>(ACCOUNT_FUNCTIONS.getBalance, { id: 2 })).toBeCloseTo(
      secondBefore - secondAmount,
      2,
    );
    await driver.navigate().refresh();
    const refreshed = await invokeCommand<CreditCardNextPayment>(ACCOUNT_FUNCTIONS.getNextPayment, {
      accountId: 3,
    });
    expect(refreshed.paymentDate).not.toBe(next.paymentDate);
  });

  it("rolls a child-category expense into its parent budget", async () => {
    const budget = await invokeCommand<BudgetDetails>(BUDGET_FUNCTIONS.create, {
      budgetPeriodTypeId: 2,
      categoryId: 1,
      currencyId: 1,
      name: "E2E Parent Budget",
      amountLimit: 500,
      startDate: monthStart(),
    });
    const expense = await invokeCommand<Movement>(MOVEMENT_FUNCTIONS.add, movementRequest());
    const details = await invokeCommand<BudgetDetails>(BUDGET_FUNCTIONS.get, {
      id: budget.budget.id,
    });
    const current = details.periods.find((period) => period.movementIds.includes(expense.id));
    expect(current?.amountSpend).toBeGreaterThanOrEqual(45);

    await invokeCommand(MOVEMENT_FUNCTIONS.update, {
      ...movementRequest({ id: expense.id, originalAmount: 65, accountAmount: 65 }),
    });
    const edited = await invokeCommand<BudgetDetails>(BUDGET_FUNCTIONS.get, {
      id: budget.budget.id,
    });
    expect(
      edited.periods.find((period) => period.movementIds.includes(expense.id))?.amountSpend,
    ).toBeGreaterThanOrEqual(65);
    await invokeCommand(MOVEMENT_FUNCTIONS.remove, { id: expense.id });
    const restored = await invokeCommand<BudgetDetails>(BUDGET_FUNCTIONS.get, {
      id: budget.budget.id,
    });
    expect(restored.periods.every((period) => !period.movementIds.includes(expense.id))).toBe(true);

    await navigateTo("/budgets", By.id("create-budget-button"));
    expect(await waitForBodyText("E2E Parent Budget")).toContain("E2E Parent Budget");
  });

  it("refreshes deterministic statistics after a financial mutation", async () => {
    const before = await invokeCommand<StatisticsResponse>("get_statistics", {
      startMs: monthStart(),
      endMs: nextMonthStart(),
      currencyId: 1,
      granularity: "day",
      options: { includeObligations: false },
    });
    await invokeCommand(
      MOVEMENT_FUNCTIONS.add,
      movementRequest({ accountAmount: 77, originalAmount: 77 }),
    );
    const after = await invokeCommand<StatisticsResponse>("get_statistics", {
      startMs: monthStart(),
      endMs: nextMonthStart(),
      currencyId: 1,
      granularity: "day",
      options: { includeObligations: false },
    });
    expect(after.overview.expenses).toBeCloseTo(before.overview.expenses + 77, 2);

    await navigateTo("/stats", By.id("statisticsPeriod"));
    const text = await driver.wait(async () => {
      const body = await driver.findElement(By.css("body")).getText();
      return body.includes("77") ? body : false;
    }, 10_000);
    expect(text).toContain("77");
  });

  it("shows a future budget amount in the next history period", async () => {
    const budget = await invokeCommand<BudgetDetails>(BUDGET_FUNCTIONS.create, {
      budgetPeriodTypeId: 2,
      categoryId: 13,
      currencyId: 1,
      name: "E2E Future Budget",
      amountLimit: 300,
      startDate: monthStart(),
    });
    await invokeCommand(BUDGET_FUNCTIONS.updateAmount, {
      id: budget.budget.id,
      amountLimit: 600,
      updateType: "next_period",
    });
    const details = await invokeCommand<BudgetDetails>(BUDGET_FUNCTIONS.get, {
      id: budget.budget.id,
    });
    expect(details.periods.at(-1)?.amountLimit).toBe(300);

    await navigateTo("/budgets", By.id("create-budget-button"));
    expect(await waitForBodyText("E2E Future Budget")).toContain("E2E Future Budget");
  });

  it("deactivates and reactivates a planning without losing its actionable state", async () => {
    const planning = (await invokeCommand<Planning[]>(PLANNING_FUNCTIONS.getAll))[0];
    if (!planning) throw new Error("No seeded planning was found");
    const deactivated = await invokeCommand<Planning>(PLANNING_FUNCTIONS.deactivate, {
      id: planning.id,
    });
    expect(deactivated.recurringRule.isActive).toBe(false);
    expect(deactivated.currentOccurrence).toBeNull();

    await driver.navigate().refresh();
    await waitForHomeReady();
    const activated = await invokeCommand<Planning>(PLANNING_FUNCTIONS.activate, {
      id: planning.id,
    });
    expect(activated.recurringRule.isActive).toBe(true);
    expect(activated.currentOccurrence).not.toBeNull();
  });
});
