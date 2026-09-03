import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockPlanningRefresh = vi.fn().mockResolvedValue(undefined);

vi.mock("@/stores/planningsStore", () => ({
  planningsStore: {
    getState: () => ({ refresh: mockPlanningRefresh }),
  },
}));

vi.unmock("@/stores/movementsStore");

import { invoke } from "@tauri-apps/api/core";

import {
  compareMovements,
  createMovementFromData,
  groupMovementsByDate,
  movementsStore,
} from "@/stores/movementsStore";
import { MOVEMENT_FUNCTIONS, MOVEMENT_TYPES } from "@/types/enums";

const mockInvoke = vi.mocked(invoke);

const movementType: MovementType = {
  id: 1,
  key: "income",
  name: "Ingreso",
};

const movement: Movement = {
  id: 1,
  typeId: 1,
  accountId: 1,
  categoryId: 1,
  currencyId: 1,
  originalAmount: 500,
  accountAmount: 500,
  timestamp: 1719705600,
  description: "Salary",
  installments: 3,
  installmentsData: [
    {
      id: 1,
      movementId: 1,
      installmentNumber: 1,
      totalInstallments: 3,
      amount: 166.67,
      dueTimestamp: 1719705600,
      paid: true,
      paidTimestamp: 1719705600,
    },
    {
      id: 2,
      movementId: 1,
      installmentNumber: 2,
      totalInstallments: 3,
      amount: 166.67,
      dueTimestamp: 1719705600,
      paid: true,
      paidTimestamp: 1719705600,
    },
    {
      id: 3,
      movementId: 1,
      installmentNumber: 3,
      totalInstallments: 3,
      amount: 166.67,
      dueTimestamp: 1719705600,
      paid: true,
      paidTimestamp: 1719705600,
    },
  ],
};

describe("movementsStore", () => {
  beforeEach(() => {
    logger.debug("Resetting movementsStore state for test");
    movementsStore.setState({
      byId: {},
      allIds: [],
      byAccount: {},
      types: [],
    });

    vi.clearAllMocks();
    mockPlanningRefresh.mockClear();
  });

  it("populate loads movements and types", async () => {
    mockInvoke.mockResolvedValueOnce([movementType]).mockResolvedValueOnce([movement]);

    await movementsStore.getState().populate();

    expect(movementsStore.getState().types).toEqual([movementType]);
    expect(movementsStore.getState().byId).toEqual({ [movement.id]: movement });
    expect(movementsStore.getState().allIds).toEqual([movement.id]);
    expect(movementsStore.getState().byAccount).toEqual({
      [movement.accountId]: [movement.id],
    });
  });

  it("populate preserves backend ordering in allIds and byAccount", async () => {
    const movements = [
      { ...movement, id: 3, timestamp: 1719705800 },
      { ...movement, id: 2, timestamp: 1719705700 },
      { ...movement, id: 1, timestamp: 1719705600 },
    ];
    mockInvoke.mockResolvedValueOnce([movementType]).mockResolvedValueOnce(movements);

    await movementsStore.getState().populate();

    const state = movementsStore.getState();
    expect(state.allIds).toEqual([3, 2, 1]);
    expect(state.byAccount[1]).toEqual([3, 2, 1]);
  });

  it("populate correctly indexes transfers under both account IDs", async () => {
    const transferMovement: Movement = {
      ...movement,
      id: 5,
      toAccountId: 2,
    };
    mockInvoke.mockResolvedValueOnce([movementType]).mockResolvedValueOnce([transferMovement]);

    await movementsStore.getState().populate();

    const state = movementsStore.getState();
    expect(state.byAccount[1]).toEqual([5]);
    expect(state.byAccount[2]).toEqual([5]);
  });

  it("add prepends movement and correctly updates indexes", async () => {
    const existingMovement = { ...movement, id: 10 };
    movementsStore.setState({
      byId: { 10: existingMovement },
      allIds: [10],
      byAccount: { 1: [10] },
      types: [],
    });

    const newMovement = { ...movement, id: 11, description: "New movement" };
    mockInvoke.mockResolvedValue(newMovement);

    await movementsStore.getState().add(newMovement);

    const state = movementsStore.getState();
    expect(state.byId[11]).toEqual(newMovement);
    expect(state.byId[10]).toEqual(existingMovement);
    expect(Object.keys(state.byId)).toHaveLength(2); // Only stored once in byId

    expect(state.allIds).toEqual([11, 10]); // Prepended
    expect(state.byAccount[1]).toEqual([11, 10]); // Prepended
  });

  it("add handles movement with toAccountId in indexes", async () => {
    const transferMovement = { ...movement, id: 12, toAccountId: 3 };
    mockInvoke.mockResolvedValue(transferMovement);

    await movementsStore.getState().add(transferMovement);

    const state = movementsStore.getState();
    expect(state.byAccount[1]).toEqual([12]);
    expect(state.byAccount[3]).toEqual([12]);
  });

  it("inserts a previous-dated movement in chronological order", async () => {
    const newest = { ...movement, id: 20, timestamp: 300, installments: undefined };
    const oldest = { ...movement, id: 10, timestamp: 100, installments: undefined };
    movementsStore.setState({
      byId: { 20: newest },
      allIds: [20],
      byAccount: { 1: [20] },
      types: [],
    });
    mockInvoke.mockResolvedValueOnce(oldest);

    await movementsStore.getState().add(oldest);

    expect(movementsStore.getState().allIds).toEqual([20, 10]);
    expect(movementsStore.getState().byAccount[1]).toEqual([20, 10]);
  });

  it("moves an edited timestamp in global and per-account indexes", async () => {
    const first = { ...movement, id: 1, timestamp: 300, installments: undefined };
    const second = { ...movement, id: 2, timestamp: 200, installments: undefined };
    movementsStore.setState({
      byId: { 1: first, 2: second },
      allIds: [1, 2],
      byAccount: { 1: [1, 2] },
      types: [],
    });
    const updated = { ...first, timestamp: 100 };
    mockInvoke.mockResolvedValueOnce(updated);

    await movementsStore.getState().update(1, updated);

    expect(movementsStore.getState().allIds).toEqual([2, 1]);
    expect(movementsStore.getState().byAccount[1]).toEqual([2, 1]);
  });

  it("uses descending IDs to break equal timestamp ties", () => {
    const movements = [
      { ...movement, id: 1, timestamp: 100 },
      { ...movement, id: 3, timestamp: 100 },
      { ...movement, id: 2, timestamp: 100 },
    ];
    expect(movements.sort(compareMovements).map(({ id }) => id)).toEqual([3, 2, 1]);
  });

  it("does not attach planning data to transfers", () => {
    const transfer = createMovementFromData(
      {
        accountId: "1",
        toAccountId: "2",
        categoryId: "0",
        currency: "1",
        amount: "100",
        date: "2026-08-18",
        time: "12:00",
        planningId: "7",
      },
      MOVEMENT_TYPES.TRANSFER,
      false,
    );

    expect(transfer.planningId).toBeUndefined();
  });

  it("does not send planning data when adding a transfer", async () => {
    const transferMovement: Movement = {
      ...movement,
      id: 13,
      typeId: MOVEMENT_TYPES.TRANSFER,
      toAccountId: 2,
      planningId: 7,
    };
    mockInvoke.mockResolvedValue(transferMovement);

    await movementsStore.getState().add(transferMovement);

    expect(mockInvoke).toHaveBeenCalledWith(
      MOVEMENT_FUNCTIONS.add,
      expect.objectContaining({ planningId: undefined }),
    );
  });

  it("passes planningId to Tauri and refreshes the linked planning", async () => {
    const linkedMovement = { ...movement, id: 14, planningId: 7 };
    mockInvoke.mockResolvedValue(linkedMovement);

    await movementsStore.getState().add(linkedMovement);

    expect(mockInvoke).toHaveBeenCalledWith(
      "add_movement",
      expect.objectContaining({ planningId: 7 }),
    );
    expect(mockPlanningRefresh).toHaveBeenCalledWith(7);
  });

  it("remove deletes movement and correctly updates indexes", async () => {
    const m1 = { ...movement, id: 1 };
    const m2 = { ...movement, id: 2, accountId: 2 };
    movementsStore.setState({
      byId: { 1: m1, 2: m2 },
      allIds: [1, 2],
      byAccount: { 1: [1], 2: [2] },
      types: [],
    });

    mockInvoke.mockResolvedValue(1);

    await movementsStore.getState().remove(1);

    const state = movementsStore.getState();
    expect(state.byId).toEqual({ 2: m2 });
    expect(state.allIds).toEqual([2]);
    expect(state.byAccount[1]).toBeUndefined();
    expect(state.byAccount[2]).toEqual([2]);
  });

  it("refreshes a linked planning after removing its movement", async () => {
    const linkedMovement = { ...movement, id: 15, planningId: 7 };
    movementsStore.setState({
      byId: { 15: linkedMovement },
      allIds: [15],
      byAccount: { 1: [15] },
      types: [],
    });
    mockInvoke.mockResolvedValue(1);

    await movementsStore.getState().remove(15);

    expect(mockPlanningRefresh).toHaveBeenCalledWith(7);
  });

  it("getById returns movement", () => {
    movementsStore.setState({
      byId: { 1: movement },
      allIds: [1],
      byAccount: { 1: [1] },
      types: [],
    });

    expect(movementsStore.getState().getById(1)).toEqual(movement);
  });

  it("refresh updates stored movements and rebuilds indexes", async () => {
    const original = {
      ...movement,
      id: 1,
      accountId: 1,
      description: "Old description",
      installments: undefined,
    };
    movementsStore.setState({
      byId: { 1: original },
      allIds: [1],
      byAccount: { 1: [1] },
      types: [],
    });

    const refreshedMovement = {
      ...original,
      accountId: 2,
      description: "Updated description",
      installments: undefined,
    };
    mockInvoke.mockResolvedValueOnce(refreshedMovement);

    await movementsStore.getState().refresh([1]);

    const state = movementsStore.getState();
    expect(state.byId[1]).toEqual(refreshedMovement);
    expect(state.byAccount[1]).toBeUndefined();
    expect(state.byAccount[2]).toEqual([1]);
  });

  it("refresh adds new movement ids when they are not already present", async () => {
    const newMovement = {
      ...movement,
      id: 10,
      accountId: 3,
      description: "New movement",
      installments: undefined,
    };
    movementsStore.setState({
      byId: {},
      allIds: [],
      byAccount: {},
      types: [],
    });

    mockInvoke.mockResolvedValueOnce(newMovement);

    await movementsStore.getState().refresh([10]);

    const state = movementsStore.getState();
    expect(state.byId[10]).toEqual(newMovement);
    expect(state.allIds).toEqual([10]);
    expect(state.byAccount[3]).toEqual([10]);
  });

  it("returns undefined for missing movement", () => {
    expect(movementsStore.getState().getById(999)).toBeUndefined();
  });

  it("update replaces movement content and updates indexes if account changes", async () => {
    const m1 = { ...movement, id: 1, originalAmount: 500, accountId: 1 };
    const m2 = { ...movement, id: 2, originalAmount: 300, accountId: 1 };
    movementsStore.setState({
      byId: { 1: m1, 2: m2 },
      allIds: [1, 2],
      byAccount: { 1: [1, 2] },
      types: [],
    });

    const updated: Movement = {
      ...m1,
      originalAmount: 750,
      accountId: 2, // Account changed!
    };
    mockInvoke.mockResolvedValue(updated);

    await movementsStore.getState().update(1, updated);

    const state = movementsStore.getState();
    expect(state.byId[1]).toEqual(updated);
    expect(state.byAccount[1]).toEqual([2]); // Only m2 remains
    expect(state.byAccount[2]).toEqual([1]); // m1 moved here
  });

  it("indexes contain only numbers (IDs)", async () => {
    mockInvoke.mockResolvedValueOnce([movementType]).mockResolvedValueOnce([movement]);
    await movementsStore.getState().populate();

    const state = movementsStore.getState();
    expect(state.allIds.every((id) => typeof id === "number")).toBe(true);
    Object.values(state.byAccount).forEach((ids) => {
      expect(ids.every((id) => typeof id === "number")).toBe(true);
    });
  });

  it("keeps movement rows and indexes unchanged when mutations fail", async () => {
    movementsStore.setState({
      byId: { [movement.id]: movement },
      allIds: [movement.id],
      byAccount: { [movement.accountId]: [movement.id] },
      types: [movementType],
    });
    const before = movementsStore.getState();
    for (const mutation of [
      () => movementsStore.getState().add(movement),
      () => movementsStore.getState().update(movement.id, movement),
      () => movementsStore.getState().remove(movement.id),
    ]) {
      mockInvoke.mockRejectedValueOnce(new Error("mutation failed"));
      await expect(mutation()).rejects.toThrow("mutation failed");
      expect(movementsStore.getState().byId).toEqual(before.byId);
      expect(movementsStore.getState().allIds).toEqual(before.allIds);
      expect(movementsStore.getState().byAccount).toEqual(before.byAccount);
    }
  });
});

describe("groupMovementsByDate", () => {
  const m1: Movement = { ...movement, id: 1, timestamp: 1719705600000 }; // 2024-06-30
  const m2: Movement = { ...movement, id: 2, timestamp: 1719705660000 }; // 2024-06-30 (same day, different time)
  const m3: Movement = { ...movement, id: 3, timestamp: 1719792000000 }; // 2024-07-01 (next day)

  const byId = { 1: m1, 2: m2, 3: m3 };

  it("groups movements correctly by day and preserves original backend ordering", () => {
    const groups = groupMovementsByDate([1, 2, 3], byId);
    expect(groups).toHaveLength(2);

    // Group 1: 2024-06-30
    expect(groups[0].ids).toEqual([1, 2]);

    // Group 2: 2024-07-01
    expect(groups[1].ids).toEqual([3]);
  });

  it("empty inputs return an empty result", () => {
    const groups = groupMovementsByDate([], byId);
    expect(groups).toEqual([]);
  });

  it("multiple movements on the same day are grouped together", () => {
    const groups = groupMovementsByDate([2, 1], byId);
    expect(groups).toHaveLength(1);
    expect(groups[0].ids).toEqual([2, 1]);
  });

  it("movements across different days create separate groups", () => {
    const groups = groupMovementsByDate([1, 3], byId);
    expect(groups).toHaveLength(2);
    expect(groups[0].ids).toEqual([1]);
    expect(groups[1].ids).toEqual([3]);
  });
});
