import { closeTauriDriver, createDriver, deleteDatabase, invokeCommand } from "@test/driver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ACCOUNT_FUNCTIONS, MOVEMENT_FUNCTIONS } from "@/types/enums";

function expectMovementType(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      key: expect.any(String),
      name: expect.any(String),
    }),
  );
}

function expectMovementTypes(value: unknown) {
  expect(Array.isArray(value)).toBe(true);

  (value as unknown[]).forEach(expectMovementType);
}

function expectMovement(value: unknown) {
  expect(value).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      typeId: expect.any(Number),
      accountId: expect.any(Number),
      categoryId: expect.any(Number),
      currencyId: expect.any(Number),
      originalAmount: expect.any(Number),
      accountAmount: expect.any(Number),
      timestamp: expect.any(Number),
    }),
  );

  const movement = value as Movement;

  expect(movement.toAccountId === null || typeof movement.toAccountId === "number").toBe(true);

  expect(movement.installments === null || typeof movement.installments === "number").toBe(true);

  expect(movement.description === null || typeof movement.description === "string").toBe(true);
}

function expectMovements(value: unknown) {
  expect(Array.isArray(value)).toBe(true);

  (value as unknown[]).forEach(expectMovement);
}

describe("Movement Commands", () => {
  beforeAll(async () => {
    await createDriver();
  });

  afterAll(async () => {
    await closeTauriDriver();
    deleteDatabase();
  });

  describe("get_movement_types", () => {
    it("returns MovementType[]", async () => {
      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.getTypes);

      expectMovementTypes(result);
    });

    it("contains seeded movement types", async () => {
      const types = await invokeCommand<MovementType[]>(MOVEMENT_FUNCTIONS.getTypes);

      expect(types.length).toBeGreaterThanOrEqual(3);

      const keys = types.map((t) => t.key);
      expect(keys).toContain("in");
      expect(keys).toContain("out");
      expect(keys).toContain("transfer");
    });
  });

  describe("get_movements", () => {
    it("returns Movement[] (initially empty)", async () => {
      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.get);

      expectMovements(result);
    });
  });

  describe("add_movement", () => {
    it("creates an income movement", async () => {
      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
        typeId: 1,
        accountId: 1,
        toAccountId: null,
        categoryId: 1,
        currencyId: 1,
        originalAmount: 500.0,
        accountAmount: 500.0,
        installments: null,
        timestamp: 1783285200000,
        description: "Test income",
      });

      expectMovement(result);

      const movement = result as Movement;

      expect(movement.typeId).toBe(1);
      expect(movement.accountId).toBe(1);
      expect(movement.originalAmount).toBe(500.0);
      expect(movement.description).toBe("Test income");
      expect(movement.toAccountId).toBeNull();
      expect(movement.installments).toBeNull();
    });

    it("creates an expense movement", async () => {
      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
        typeId: 2,
        accountId: 1,
        toAccountId: null,
        categoryId: 1,
        currencyId: 1,
        originalAmount: 150.0,
        accountAmount: 150.0,
        installments: null,
        timestamp: 1719705600,
        description: "Test expense",
      });

      expectMovement(result);

      const movement = result as Movement;

      expect(movement.typeId).toBe(2);
      expect(movement.originalAmount).toBe(150.0);
      expect(movement.description).toBe("Test expense");
    });

    it("creates an expense with installments", async () => {
      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
        typeId: 2,
        accountId: 1,
        toAccountId: null,
        categoryId: 1,
        currencyId: 1,
        originalAmount: 1200.0,
        accountAmount: 1200.0,
        installments: 12,
        timestamp: 1719705600,
        description: "Laptop purchase",
      });

      expectMovement(result);

      const movement = result as Movement;

      expect(movement.installments).toBe(12);
    });

    it("creates a transfer movement", async () => {
      const destinationAccount = await invokeCommand<Account>(ACCOUNT_FUNCTIONS.add, {
        name: "USD Transfer Destination",
        balance: 50.0,
        typeId: 1,
        currencyId: 2,
        creditInfo: null,
      });

      expect(destinationAccount.currencyId).toBe(2);

      const accountsBefore = await invokeCommand<Account[]>(ACCOUNT_FUNCTIONS.get);
      const originBefore = accountsBefore.find((account) => account.id === 1)?.balance;
      const destinationBefore = accountsBefore.find(
        (account) => account.id === destinationAccount.id,
      )?.balance;

      expect(originBefore).toEqual(expect.any(Number));
      expect(destinationBefore).toEqual(expect.any(Number));
      if (originBefore === undefined || destinationBefore === undefined) {
        throw new Error("Expected seeded source and destination balances");
      }

      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
        typeId: 3,
        accountId: 1,
        toAccountId: destinationAccount.id,
        categoryId: 1,
        currencyId: 1,
        originalAmount: 200.0,
        accountAmount: 180.0,
        installments: null,
        timestamp: 1719705600,
        description: "Transfer to savings",
      });

      expectMovement(result);

      const movement = result as Movement;

      expect(movement.typeId).toBe(3);
      expect(movement.toAccountId).toBe(destinationAccount.id);
      expect(movement.originalAmount).toBe(200.0);
      expect(movement.accountAmount).toBe(180.0);

      const accountsAfter = await invokeCommand<Account[]>(ACCOUNT_FUNCTIONS.get);
      expect(accountsAfter.find((account) => account.id === 1)?.balance).toBe(
        originBefore - 200.0,
      );
      expect(accountsAfter.find((account) => account.id === destinationAccount.id)?.balance).toBe(
        destinationBefore + 180.0,
      );
    });

    it("creates a movement without description", async () => {
      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
        typeId: 1,
        accountId: 1,
        toAccountId: null,
        categoryId: 1,
        currencyId: 1,
        originalAmount: 50.0,
        accountAmount: 50.0,
        installments: null,
        timestamp: 1719705600,
        description: null,
      });

      expectMovement(result);

      const movement = result as Movement;

      expect(movement.description).toBeNull();
    });

    it("rejects movement with invalid type", async () => {
      await expect(
        invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
          typeId: 999,
          accountId: 1,
          toAccountId: null,
          categoryId: 1,
          currencyId: 1,
          originalAmount: 100.0,
          accountAmount: 100.0,
          installments: null,
          timestamp: 1719705600,
          description: null,
        }),
      ).rejects.toThrow();
    });

    it("rejects movement with zero amount", async () => {
      await expect(
        invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
          typeId: 1,
          accountId: 1,
          toAccountId: null,
          categoryId: 1,
          currencyId: 1,
          originalAmount: 0,
          accountAmount: 0,
          installments: null,
          timestamp: 1719705600,
          description: null,
        }),
      ).rejects.toThrow();
    });

    it("rejects transfer without toAccountId", async () => {
      await expect(
        invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
          typeId: 3,
          accountId: 1,
          toAccountId: null,
          categoryId: 1,
          currencyId: 1,
          originalAmount: 100.0,
          accountAmount: 100.0,
          installments: null,
          timestamp: 1719705600,
          description: null,
        }),
      ).rejects.toThrow();
    });

    it("rejects transfer to the same account", async () => {
      await expect(
        invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
          typeId: 3,
          accountId: 1,
          toAccountId: 1,
          categoryId: 1,
          currencyId: 1,
          originalAmount: 100.0,
          accountAmount: 100.0,
          installments: null,
          timestamp: 1719705600,
          description: null,
        }),
      ).rejects.toThrow();
    });

    it("rejects non-transfer with toAccountId", async () => {
      await expect(
        invokeCommand<unknown>(MOVEMENT_FUNCTIONS.add, {
          typeId: 1,
          accountId: 1,
          toAccountId: 2,
          categoryId: 1,
          currencyId: 1,
          originalAmount: 100.0,
          accountAmount: 100.0,
          installments: null,
          timestamp: 1719705600,
          description: null,
        }),
      ).rejects.toThrow();
    });
  });

  describe("get_movements after inserts", () => {
    it("returns previously added movements", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      expect(movements.length).toBeGreaterThanOrEqual(5);

      expectMovements(movements);
    });

    it("returns movements ordered by timestamp descending", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      for (let i = 1; i < movements.length; i++) {
        expect(movements[i - 1].timestamp).toBeGreaterThanOrEqual(movements[i].timestamp);
      }
    });
  });

  describe("get_movement", () => {
    it("returns a single movement by id", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);
      expect(movements.length).toBeGreaterThanOrEqual(1);

      const targetMovement = movements[0];
      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.getById, {
        movementId: targetMovement.id,
      });

      expectMovement(result);

      const movement = result as Movement;
      expect(movement.id).toBe(targetMovement.id);
      expect(movement.typeId).toBe(targetMovement.typeId);
      expect(movement.accountId).toBe(targetMovement.accountId);
    });
  });

  describe("get_movement_installments", () => {
    it("returns installments for a movement with installments", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      const withInstallments = movements.find(
        (m) => m.installments !== undefined && m.installments > 0,
      );
      expect(withInstallments).toBeDefined();

      if (!withInstallments) return;

      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.getInstallments, {
        movementId: withInstallments.id,
      });

      expect(Array.isArray(result)).toBe(true);

      const installments = result as MovementInstallment[];

      expect(installments.length).toBe(withInstallments.installments);
    });

    it("returns installments with correct shape", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      const withInstallments = movements.find(
        (m) => m.installments !== undefined && m.installments > 0,
      );
      expect(withInstallments).toBeDefined();

      if (!withInstallments) return;

      const installments = await invokeCommand<MovementInstallment[]>(
        MOVEMENT_FUNCTIONS.getInstallments,
        { movementId: withInstallments.id },
      );

      for (const installment of installments) {
        expect(installment).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            movementId: withInstallments.id,
            installmentNumber: expect.any(Number),
            totalInstallments: withInstallments.installments,
            amount: expect.any(Number),
            dueTimestamp: expect.any(Number),
            paid: expect.any(Boolean),
          }),
        );

        expect(
          installment.paidTimestamp === null || typeof installment.paidTimestamp === "number",
        ).toBe(true);
      }
    });

    it("returns installments numbered sequentially", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      const withInstallments = movements.find(
        (m) => m.installments !== undefined && m.installments > 0,
      );
      expect(withInstallments).toBeDefined();

      if (!withInstallments) return;

      const installments = await invokeCommand<MovementInstallment[]>(
        MOVEMENT_FUNCTIONS.getInstallments,
        { movementId: withInstallments.id },
      );

      const numbers = installments.map((i) => i.installmentNumber).sort((a, b) => a - b);

      for (let i = 0; i < numbers.length; i++) {
        expect(numbers[i]).toBe(i + 1);
      }
    });

    it("returns empty array for a movement without installments", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      const withoutInstallments = movements.find(
        (m) => m.installments === null || m.installments === 0,
      );
      expect(withoutInstallments).toBeDefined();

      if (!withoutInstallments) return;

      const result = await invokeCommand<MovementInstallment[]>(
        MOVEMENT_FUNCTIONS.getInstallments,
        { movementId: withoutInstallments.id },
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("update_movement", () => {
    it("updates a movement's amount and description", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      const target = movements[0];

      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.update, {
        id: target.id,
        typeId: target.typeId,
        accountId: target.accountId,
        toAccountId: target.toAccountId ?? null,
        categoryId: target.categoryId,
        currencyId: target.currencyId,
        originalAmount: 999.99,
        accountAmount: 999.99,
        installments: target.installments ?? null,
        timestamp: target.timestamp,
        description: "Updated description",
      });

      expectMovement(result);

      const updated = result as Movement;

      expect(updated.id).toBe(target.id);
      expect(updated.originalAmount).toBe(999.99);
      expect(updated.description).toBe("Updated description");
    });

    it("rejects changing the movement type", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      const incomeMovement = movements.find((m) => m.typeId === 1);
      expect(incomeMovement).toBeDefined();

      if (!incomeMovement) return new Error("No income movement found for testing.");

      await expect(
        invokeCommand<unknown>(MOVEMENT_FUNCTIONS.update, {
          id: incomeMovement.id,
          typeId: 2,
          accountId: incomeMovement.accountId,
          toAccountId: null,
          categoryId: incomeMovement.categoryId,
          currencyId: incomeMovement.currencyId,
          originalAmount: incomeMovement.originalAmount,
          accountAmount: incomeMovement.accountAmount,
          installments: null,
          timestamp: incomeMovement.timestamp,
          description: incomeMovement.description ?? null,
        }),
      ).rejects.toThrow();
    });
  });

  describe("remove_movement", () => {
    it("deletes a movement and returns count", async () => {
      const movements = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      const target = movements[0];

      const result = await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.remove, {
        id: target.id,
      });

      expect(result).toEqual(expect.any(Number));

      const deletedRows = result as number;

      expect(deletedRows).toBeGreaterThanOrEqual(1);
    });

    it("movement is no longer returned after deletion", async () => {
      const movementsBefore = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      const target = movementsBefore[0];

      await invokeCommand<unknown>(MOVEMENT_FUNCTIONS.remove, {
        id: target.id,
      });

      const movementsAfter = await invokeCommand<Movement[]>(MOVEMENT_FUNCTIONS.get);

      const found = movementsAfter.find((m) => m.id === target.id);
      expect(found).toBeUndefined();
    });
  });
});
