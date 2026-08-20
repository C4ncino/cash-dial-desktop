import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";

import {
  getActionableOccurrence,
  isOccurrenceOverdue,
  planningsStore,
} from "@/stores/planningsStore";
import { PLANNING_STATUS } from "@/types/enums";

const mockInvoke = vi.mocked(invoke);

const sampleRecurringType: PlanningRecurringType = {
  id: 3,
  key: "monthly",
  name: "Mensual",
  singular: "mes",
  plural: "meses",
};

const sampleStatus: PlanningStatus = {
  id: 1,
  key: "pending",
  name: "Pendiente",
  color: "#eab308",
};

const sampleOccurrence: PlanningOccurrence = {
  id: 101,
  planningId: 1,
  movementId: null,
  statusId: PLANNING_STATUS.PENDING,
  expectedDate: 1770000000000,
  isOverdue: false,
};

const samplePlanning: Planning = {
  id: 1,
  typeId: 2,
  accountId: 1,
  categoryId: 5,
  currencyId: 1,
  name: "Suscripción Netflix",
  amount: 219.0,
  recurringRule: {
    id: 1,
    recurringTypeId: 3,
    intervalStep: 1,
    startDate: 1770000000000,
    endDate: null,
    isActive: true,
    weekDays: [],
    monthDays: [15],
    yearDays: [],
  },
  currentOccurrence: sampleOccurrence,
};

describe("planningsStore", () => {
  beforeEach(() => {
    planningsStore.setState({
      plannings: [],
      recurringTypes: [],
      statuses: [],
      occurrencesByPlanning: {},
    });
    vi.clearAllMocks();
  });

  it("populate loads recurring types, statuses, and plannings", async () => {
    mockInvoke
      .mockResolvedValueOnce([sampleRecurringType])
      .mockResolvedValueOnce([sampleStatus])
      .mockResolvedValueOnce([samplePlanning]);

    await planningsStore.getState().populate();

    expect(planningsStore.getState().recurringTypes).toEqual([sampleRecurringType]);
    expect(planningsStore.getState().statuses).toEqual([sampleStatus]);
    expect(planningsStore.getState().plannings).toEqual([samplePlanning]);
  });

  it("getById returns the correct planning", () => {
    planningsStore.setState({
      plannings: [samplePlanning],
      recurringTypes: [],
      statuses: [],
      occurrencesByPlanning: {},
    });

    expect(planningsStore.getState().getById(1)).toEqual(samplePlanning);
    expect(planningsStore.getState().getById(999)).toBeUndefined();
  });

  it("getOccurrences loads and caches occurrences for a planning", async () => {
    mockInvoke.mockResolvedValueOnce([sampleOccurrence]);

    const occs = await planningsStore.getState().getOccurrences(1);

    expect(occs).toEqual([sampleOccurrence]);
    expect(planningsStore.getState().occurrencesByPlanning[1]).toEqual([sampleOccurrence]);
  });

  it("create prepends new planning to list", async () => {
    mockInvoke.mockResolvedValueOnce(samplePlanning);

    const request: CreatePlanningRequest = {
      typeId: 2,
      accountId: 1,
      categoryId: 5,
      currencyId: 1,
      name: "Suscripción Netflix",
      amount: 219.0,
      recurringTypeId: 3,
      intervalStep: 1,
      startDate: 1770000000000,
      monthDays: [15],
    };

    const created = await planningsStore.getState().create(request);

    expect(created).toEqual(samplePlanning);
    expect(planningsStore.getState().plannings).toHaveLength(1);
    expect(planningsStore.getState().plannings[0]).toEqual(samplePlanning);
  });

  it("update replaces existing planning in list", async () => {
    planningsStore.setState({
      plannings: [samplePlanning],
      recurringTypes: [],
      statuses: [],
      occurrencesByPlanning: {},
    });

    const updatedPlanning = { ...samplePlanning, amount: 299.0 };
    mockInvoke.mockResolvedValueOnce(updatedPlanning);

    const result = await planningsStore.getState().update(1, {
      typeId: 2,
      accountId: 1,
      categoryId: 5,
      currencyId: 1,
      name: "Suscripción Netflix",
      amount: 299.0,
      recurringTypeId: 3,
      intervalStep: 1,
      startDate: 1770000000000,
      monthDays: [15],
    });

    expect(result.amount).toBe(299.0);
    expect(planningsStore.getState().getById(1)?.amount).toBe(299.0);
  });

  it("remove deletes planning and purges cached occurrences", async () => {
    planningsStore.setState({
      plannings: [samplePlanning],
      recurringTypes: [],
      statuses: [],
      occurrencesByPlanning: { 1: [sampleOccurrence] },
    });
    mockInvoke.mockResolvedValueOnce(1);

    await planningsStore.getState().remove(1);

    expect(planningsStore.getState().plannings).toHaveLength(0);
    expect(planningsStore.getState().occurrencesByPlanning[1]).toBeUndefined();
  });

  it("activate and deactivate update active status", async () => {
    planningsStore.setState({
      plannings: [samplePlanning],
      recurringTypes: [],
      statuses: [],
      occurrencesByPlanning: {},
    });

    const deactivated = {
      ...samplePlanning,
      recurringRule: { ...samplePlanning.recurringRule, isActive: false },
      currentOccurrence: null,
    };
    mockInvoke.mockResolvedValueOnce(deactivated);

    await planningsStore.getState().deactivate(1);
    expect(planningsStore.getState().getById(1)?.recurringRule.isActive).toBe(false);

    const activated = {
      ...samplePlanning,
      recurringRule: { ...samplePlanning.recurringRule, isActive: true },
    };
    mockInvoke.mockResolvedValueOnce(activated);

    await planningsStore.getState().activate(1);
    expect(planningsStore.getState().getById(1)?.recurringRule.isActive).toBe(true);
  });

  it("cancelOccurrence cancels occurrence and refreshes planning", async () => {
    planningsStore.setState({
      plannings: [samplePlanning],
      recurringTypes: [],
      statuses: [],
      occurrencesByPlanning: { 1: [sampleOccurrence] },
    });

    const canceledOcc: PlanningOccurrence = {
      ...sampleOccurrence,
      statusId: PLANNING_STATUS.CANCELED,
    };
    const nextOcc: PlanningOccurrence = {
      id: 102,
      planningId: 1,
      movementId: null,
      statusId: PLANNING_STATUS.PENDING,
      expectedDate: 1772600000000,
      isOverdue: false,
    };
    const updatedPlanning = { ...samplePlanning, currentOccurrence: nextOcc };

    mockInvoke.mockResolvedValueOnce(canceledOcc).mockResolvedValueOnce(updatedPlanning);

    const res = await planningsStore.getState().cancelOccurrence(101, 1);

    expect(res.statusId).toBe(PLANNING_STATUS.CANCELED);
    expect(planningsStore.getState().getById(1)?.currentOccurrence?.id).toBe(102);
    expect(planningsStore.getState().occurrencesByPlanning[1][0].statusId).toBe(
      PLANNING_STATUS.CANCELED,
    );
  });

  it("completeOccurrence marks occurrence completed and updates planning", async () => {
    planningsStore.setState({
      plannings: [samplePlanning],
      recurringTypes: [],
      statuses: [],
      occurrencesByPlanning: { 1: [sampleOccurrence] },
    });

    const completedOcc: PlanningOccurrence = {
      ...sampleOccurrence,
      statusId: PLANNING_STATUS.COMPLETED,
      movementId: 50,
    };
    const nextOcc: PlanningOccurrence = {
      id: 102,
      planningId: 1,
      movementId: null,
      statusId: PLANNING_STATUS.PENDING,
      expectedDate: 1772600000000,
      isOverdue: false,
    };
    const updatedPlanning = { ...samplePlanning, currentOccurrence: nextOcc };

    mockInvoke.mockResolvedValueOnce(completedOcc).mockResolvedValueOnce(updatedPlanning);

    const res = await planningsStore.getState().completeOccurrence(101, 50, 1);

    expect(res.statusId).toBe(PLANNING_STATUS.COMPLETED);
    expect(res.movementId).toBe(50);
    expect(planningsStore.getState().getById(1)?.currentOccurrence?.id).toBe(102);
  });

  it("refresh updates single planning", async () => {
    planningsStore.setState({
      plannings: [samplePlanning],
      recurringTypes: [],
      statuses: [],
      occurrencesByPlanning: {},
    });

    const refreshed = { ...samplePlanning, name: "Netflix Premium" };
    mockInvoke.mockResolvedValueOnce(refreshed);

    const res = await planningsStore.getState().refresh(1);

    expect(res?.name).toBe("Netflix Premium");
    expect(planningsStore.getState().getById(1)?.name).toBe("Netflix Premium");
  });

  it("getActionableOccurrence returns currentOccurrence", () => {
    expect(getActionableOccurrence(samplePlanning)).toEqual(sampleOccurrence);
    expect(getActionableOccurrence({ ...samplePlanning, currentOccurrence: null })).toBeUndefined();
  });

  it("isOccurrenceOverdue evaluates pending date against today timestamp", () => {
    const today = 1770000000000;
    const pastOcc: PlanningOccurrence = {
      ...sampleOccurrence,
      expectedDate: today - 86400000,
      statusId: PLANNING_STATUS.PENDING,
    };
    const futureOcc: PlanningOccurrence = {
      ...sampleOccurrence,
      expectedDate: today + 86400000,
      statusId: PLANNING_STATUS.PENDING,
    };
    const completedPastOcc: PlanningOccurrence = {
      ...pastOcc,
      statusId: PLANNING_STATUS.COMPLETED,
    };

    expect(isOccurrenceOverdue(pastOcc, today)).toBe(true);
    expect(isOccurrenceOverdue(futureOcc, today)).toBe(false);
    expect(isOccurrenceOverdue(completedPastOcc, today)).toBe(false);
  });

  it("keeps planning lists and occurrence caches unchanged when mutations fail", async () => {
    planningsStore.setState({
      plannings: [samplePlanning],
      recurringTypes: [sampleRecurringType],
      statuses: [sampleStatus],
      occurrencesByPlanning: { 1: [sampleOccurrence] },
    });
    const before = JSON.stringify(planningsStore.getState());
    for (const mutation of [
      () => planningsStore.getState().create({} as CreatePlanningRequest),
      () => planningsStore.getState().update(1, {} as UpdatePlanningRequest),
      () => planningsStore.getState().activate(1),
      () => planningsStore.getState().deactivate(1),
      () => planningsStore.getState().remove(1),
    ]) {
      mockInvoke.mockRejectedValueOnce(new Error("mutation failed"));
      await expect(mutation()).rejects.toThrow("mutation failed");
      expect(JSON.stringify(planningsStore.getState())).toBe(before);
    }
  });
});
