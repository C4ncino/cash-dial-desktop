import { closeTauriDriver, createDriver, deleteDatabase, invokeCommand } from "@test/driver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ACCOUNT_FUNCTIONS,
  CATEGORY_FUNCTIONS,
  CURRENCY_FUNCTIONS,
  MOVEMENT_FUNCTIONS,
  MOVEMENT_TYPES,
  PLANNING_FUNCTIONS,
  PLANNINGS_RECURRING_TYPES,
} from "@/types/enums";

function expectRecurringType(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      key: expect.any(String),
      name: expect.any(String),
      singular: expect.any(String),
      plural: expect.any(String),
    }),
  );
}

function expectStatus(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      key: expect.any(String),
      color: expect.any(String),
      name: expect.any(String),
    }),
  );
}

function expectOccurrence(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      planningId: expect.any(Number),
      statusId: expect.any(Number),
      expectedDate: expect.any(Number),
      isOverdue: expect.any(Boolean),
    }),
  );
  const occurrence = value as PlanningOccurrence;
  expect(occurrence.movementId === null || typeof occurrence.movementId === "number").toBe(true);
}

function expectPlanning(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      typeId: expect.any(Number),
      accountId: expect.any(Number),
      categoryId: expect.any(Number),
      currencyId: expect.any(Number),
      name: expect.any(String),
      amount: expect.any(Number),
      recurringRule: expect.any(Object),
    }),
  );
  const planning = value as Planning;
  expect(planning.recurringRule).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      recurringTypeId: expect.any(Number),
      intervalStep: expect.any(Number),
      startDate: expect.any(Number),
      isActive: expect.any(Boolean),
      weekDays: expect.any(Array),
      monthDays: expect.any(Array),
      yearDays: expect.any(Array),
    }),
  );
  expect(
    planning.currentOccurrence === null ||
      planning.currentOccurrence === undefined ||
      typeof planning.currentOccurrence === "object",
  ).toBe(true);
  if (planning.currentOccurrence) expectOccurrence(planning.currentOccurrence);
}

function expectPlanningList(value: unknown) {
  expect(Array.isArray(value)).toBe(true);
  (value as unknown[]).forEach(expectPlanning);
}

const startDate = (() => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
})();

describe("Tauri - Planning commands", () => {
  let accountId: number;
  let categoryId: number;
  let currencyId: number;

  beforeAll(async () => {
    await createDriver();
    const accounts = await invokeCommand<Account[]>(ACCOUNT_FUNCTIONS.get);
    const account = accounts.find((item) => item.type.id !== 3) ?? accounts[0];
    accountId = account.id;
    categoryId = (await invokeCommand<Category[]>(CATEGORY_FUNCTIONS.get))[0].id;
    currencyId = (await invokeCommand<Currency[]>(CURRENCY_FUNCTIONS.get))[0].id;
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  it("returns typed recurring types, statuses, plannings, and occurrences", async () => {
    const recurringTypes = await invokeCommand<unknown>(PLANNING_FUNCTIONS.getRecurringTypes);
    const statuses = await invokeCommand<unknown>(PLANNING_FUNCTIONS.getStatuses);
    const plannings = await invokeCommand<unknown>(PLANNING_FUNCTIONS.getAll);
    expect(Array.isArray(recurringTypes)).toBe(true);
    expect(Array.isArray(statuses)).toBe(true);
    (recurringTypes as unknown[]).forEach(expectRecurringType);
    (statuses as unknown[]).forEach(expectStatus);
    expectPlanningList(plannings);
  });

  it.each([
    [PLANNINGS_RECURRING_TYPES.DAILY, { weekDays: null, monthDays: null, yearDays: null }],
    [
      PLANNINGS_RECURRING_TYPES.WEEKLY,
      { weekDays: [new Date().getDay()], monthDays: null, yearDays: null },
    ],
    [PLANNINGS_RECURRING_TYPES.MONTHLY, { weekDays: null, monthDays: [15], yearDays: null }],
    [
      PLANNINGS_RECURRING_TYPES.YEARLY,
      { weekDays: null, monthDays: null, yearDays: [{ month: 6, dayOfMonth: 15 }] },
    ],
  ])(
    "creates and reads a %s planning with the typed recurrence rule",
    async (recurringTypeId, days) => {
      const created = await invokeCommand<unknown>(PLANNING_FUNCTIONS.create, {
        request: {
          typeId: MOVEMENT_TYPES.EXPENSE,
          accountId,
          categoryId,
          currencyId,
          name: `Integration planning ${recurringTypeId}`,
          amount: 25,
          recurringTypeId,
          intervalStep: 1,
          startDate,
          endDate: null,
          ...days,
        },
      });
      expectPlanning(created);
      const planning = created as Planning;
      expect(planning.recurringRule.recurringTypeId).toBe(recurringTypeId);
      if (planning.currentOccurrence) expectOccurrence(planning.currentOccurrence);
      const fetched = await invokeCommand<unknown>(PLANNING_FUNCTIONS.get, {
        planningId: planning.id,
      });
      expectPlanning(fetched);
      const occurrences = await invokeCommand<unknown>(PLANNING_FUNCTIONS.getOccurrences, {
        planningId: planning.id,
      });
      expect(Array.isArray(occurrences)).toBe(true);
      (occurrences as unknown[]).forEach(expectOccurrence);
      await invokeCommand(PLANNING_FUNCTIONS.delete, { id: planning.id });
    },
  );

  it("rejects invalid planning type, interval, date range, and recurrence days", async () => {
    await expect(
      invokeCommand(PLANNING_FUNCTIONS.create, {
        request: {
          typeId: 99,
          accountId,
          categoryId,
          currencyId,
          name: "Invalid",
          amount: 1,
          recurringTypeId: 99,
          intervalStep: 0,
          startDate,
          endDate: startDate - 1,
          weekDays: null,
          monthDays: null,
          yearDays: null,
        },
      }),
    ).rejects.toThrow();
    await expect(
      invokeCommand(PLANNING_FUNCTIONS.create, {
        request: {
          typeId: MOVEMENT_TYPES.EXPENSE,
          accountId,
          categoryId,
          currencyId,
          name: "Invalid days",
          amount: 1,
          recurringTypeId: PLANNINGS_RECURRING_TYPES.WEEKLY,
          intervalStep: 1,
          startDate,
          endDate: null,
          weekDays: [9],
          monthDays: null,
          yearDays: null,
        },
      }),
    ).rejects.toThrow();

    const invalidReferences = [
      { accountId: 999999, categoryId, currencyId, amount: 1 },
      { accountId, categoryId: 999999, currencyId, amount: 1 },
      { accountId, categoryId, currencyId: 999999, amount: 1 },
      { accountId, categoryId, currencyId, amount: -1 },
    ];

    for (const invalid of invalidReferences) {
      await expect(
        invokeCommand(PLANNING_FUNCTIONS.create, {
          request: {
            typeId: MOVEMENT_TYPES.EXPENSE,
            ...invalid,
            name: "Invalid reference",
            recurringTypeId: PLANNINGS_RECURRING_TYPES.DAILY,
            intervalStep: 1,
            startDate,
            endDate: null,
            weekDays: null,
            monthDays: null,
            yearDays: null,
          },
        }),
      ).rejects.toThrow();
    }
  });

  it("updates, deactivates, activates, cancels, and deletes a planning", async () => {
    const created = await invokeCommand<Planning>(PLANNING_FUNCTIONS.create, {
      request: {
        typeId: MOVEMENT_TYPES.EXPENSE,
        accountId,
        categoryId,
        currencyId,
        name: "Lifecycle planning",
        amount: 30,
        recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
        intervalStep: 1,
        startDate,
        endDate: null,
        weekDays: null,
        monthDays: [15],
        yearDays: null,
      },
    });
    const updated = await invokeCommand<unknown>(PLANNING_FUNCTIONS.update, {
      id: created.id,
      request: {
        typeId: MOVEMENT_TYPES.EXPENSE,
        accountId,
        categoryId,
        currencyId,
        name: "Updated lifecycle",
        amount: 35,
        recurringTypeId: PLANNINGS_RECURRING_TYPES.MONTHLY,
        intervalStep: 1,
        startDate,
        endDate: null,
        weekDays: null,
        monthDays: [16],
        yearDays: null,
      },
    });
    expectPlanning(updated);
    expect((updated as Planning).name).toBe("Updated lifecycle");
    expectPlanning(await invokeCommand(PLANNING_FUNCTIONS.deactivate, { id: created.id }));
    expectPlanning(await invokeCommand(PLANNING_FUNCTIONS.activate, { id: created.id }));
    const cancellationPlanning = await invokeCommand<Planning>(PLANNING_FUNCTIONS.create, {
      request: {
        typeId: MOVEMENT_TYPES.EXPENSE,
        accountId,
        categoryId,
        currencyId,
        name: "Cancellation planning",
        amount: 30,
        recurringTypeId: PLANNINGS_RECURRING_TYPES.DAILY,
        intervalStep: 1,
        startDate,
        endDate: null,
        weekDays: null,
        monthDays: null,
        yearDays: null,
      },
    });
    const occurrences = await invokeCommand<PlanningOccurrence[]>(
      PLANNING_FUNCTIONS.getOccurrences,
      { planningId: cancellationPlanning.id },
    );
    const pendingOccurrence = occurrences.find((occurrence) => occurrence.statusId === 1);
    expect(pendingOccurrence).toBeDefined();
    const canceled = await invokeCommand<unknown>(PLANNING_FUNCTIONS.cancelOccurrence, {
      occurrenceId: pendingOccurrence!.id,
    });
    expectOccurrence(canceled);
    await invokeCommand(PLANNING_FUNCTIONS.delete, { id: cancellationPlanning.id });
    await invokeCommand(PLANNING_FUNCTIONS.delete, { id: created.id });
  });

  it("completes a compatible linked movement and restores the occurrence on removal", async () => {
    const planning = await invokeCommand<Planning>(PLANNING_FUNCTIONS.create, {
      request: {
        typeId: MOVEMENT_TYPES.EXPENSE,
        accountId,
        categoryId,
        currencyId,
        name: "Movement linked planning",
        amount: 40,
        recurringTypeId: PLANNINGS_RECURRING_TYPES.DAILY,
        intervalStep: 1,
        startDate,
        endDate: null,
        weekDays: null,
        monthDays: null,
        yearDays: null,
      },
    });
    const movement = await invokeCommand<Movement>(MOVEMENT_FUNCTIONS.add, {
      typeId: MOVEMENT_TYPES.EXPENSE,
      accountId,
      toAccountId: null,
      categoryId,
      currencyId,
      originalAmount: 40,
      accountAmount: 40,
      installments: null,
      timestamp: Date.now(),
      description: "Linked",
      planningId: planning.id,
    });
    expectPlanning(await invokeCommand(PLANNING_FUNCTIONS.get, { planningId: planning.id }));
    await invokeCommand(MOVEMENT_FUNCTIONS.remove, { id: movement.id });
    const occurrences = await invokeCommand<PlanningOccurrence[]>(
      PLANNING_FUNCTIONS.getOccurrences,
      { planningId: planning.id },
    );
    expect(
      occurrences.some((occurrence) => occurrence.movementId === null && occurrence.statusId === 1),
    ).toBe(true);
    await invokeCommand(PLANNING_FUNCTIONS.delete, { id: planning.id });
    await expect(
      invokeCommand(PLANNING_FUNCTIONS.get, { planningId: planning.id }),
    ).rejects.toThrow();
  });
});
