import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { movementsCommands } from "@/services/tauri/movements";
import { planningsStore } from "@/stores/planningsStore";
import { statisticsStore } from "@/stores/statisticsStore";
import { MOVEMENT_TYPES } from "@/types/enums";

export function buildByAccountIndex(movements: Movement[]): Record<number, number[]> {
  const byAccount: Record<number, number[]> = {};

  for (const movement of movements) {
    if (!movement) continue;

    const addAccount = (accountId: number) => {
      if (!byAccount[accountId]) byAccount[accountId] = [];

      byAccount[accountId].push(movement.id);
    };

    addAccount(movement.accountId);

    if (movement.toAccountId) addAccount(movement.toAccountId);
  }

  return byAccount;
}

async function attachInstallmentsIfNeeded(movement: Movement): Promise<Movement> {
  if (!movement.installments) return { ...movement };

  const installmentsData = await movementsCommands.getInstallments(movement.id);

  return {
    ...movement,
    installmentsData: installmentsData ?? movement.installmentsData,
  };
}

interface MovementsStoreActions {
  refresh: (movementIds: number[]) => Promise<void>;
}

export const movementsStore = createStore<
  MovementsStore & Actions<Movement> & MovementsStoreActions
>((set, get) => ({
  byId: {} as Record<number, Movement>,
  allIds: [] as number[],
  byAccount: {} as Record<number, number[]>,
  types: [] as MovementType[],

  populate: async () => {
    const types = await movementsCommands.getTypes();
    const movements = await movementsCommands.getAll();

    logger.debug("Movements:", movements);
    logger.debug("Movement types:", types);

    const finalMovements = await Promise.all(movements.map(attachInstallmentsIfNeeded));

    const byId = finalMovements.reduce<Record<number, Movement>>((acc, movement) => {
      acc[movement.id] = movement;
      return acc;
    }, {});

    const allIds = finalMovements.map((movement) => movement.id);

    const byAccount = buildByAccountIndex(finalMovements);

    return set({
      byId,
      allIds,
      byAccount,
      types,
    });
  },

  refresh: async (movementIds: number[]) => {
    const uniqueMovementIds = Array.from(new Set(movementIds));

    if (uniqueMovementIds.length === 0) return;

    const refreshedMovements = await Promise.all(
      uniqueMovementIds.map(async (id) => {
        const movement = await movementsCommands.get(id);
        return attachInstallmentsIfNeeded(movement);
      }),
    );

    set((state) => {
      const byId = { ...state.byId };
      const allIds = [...state.allIds];

      for (const movement of refreshedMovements) {
        byId[movement.id] = movement;

        if (!allIds.includes(movement.id)) allIds.unshift(movement.id);
      }

      const byAccount = buildByAccountIndex(allIds.map((id) => byId[id]));

      return {
        byId,
        allIds,
        byAccount,
      };
    });
  },

  add: async (movement: Movement) => {
    const planningId =
      movement.typeId === MOVEMENT_TYPES.TRANSFER ? undefined : movement.planningId;

    const createdMovement = await movementsCommands.add({ ...movement, planningId });
    const newMovement = planningId ? { ...createdMovement, planningId } : createdMovement;

    if (newMovement.installments) {
      newMovement.installmentsData = await movementsCommands.getInstallments(newMovement.id);
    }

    logger.info("Movement created", newMovement);

    if (planningId) {
      await planningsStore.getState().refresh(planningId);
    }
    statisticsStore.getState().invalidate();

    set((state) => {
      const byId = { ...state.byId, [newMovement.id]: newMovement };
      const allIds = [newMovement.id, ...state.allIds];

      const byAccount = { ...state.byAccount };
      const accId = newMovement.accountId;
      byAccount[accId] = [newMovement.id, ...(byAccount[accId] || [])];

      if (newMovement.toAccountId) {
        const toAccId = newMovement.toAccountId;
        byAccount[toAccId] = [newMovement.id, ...(byAccount[toAccId] || [])];
      }

      return {
        byId,
        allIds,
        byAccount,
      };
    });

    return newMovement;
  },

  remove: async (id: number) => {
    const removedMovement = get().byId[id];
    await movementsCommands.remove(id);

    if (removedMovement?.planningId) {
      await planningsStore.getState().refresh(removedMovement.planningId);
    }
    statisticsStore.getState().invalidate();

    return set((state) => {
      const byId = { ...state.byId };
      delete byId[id];

      const allIds = state.allIds.filter((mId) => mId !== id);
      const byAccount = buildByAccountIndex(allIds.map((mId) => byId[mId]).filter(Boolean));

      return {
        byId,
        allIds,
        byAccount,
      };
    });
  },

  getById: (id: number) => get().byId[id],

  update: async (id: number, movement: Movement) => {
    const updatedMovement = await movementsCommands.update(id, movement);

    if (updatedMovement.installments) {
      updatedMovement.installmentsData = await movementsCommands.getInstallments(
        updatedMovement.id,
      );
    }
    statisticsStore.getState().invalidate();

    return set((state) => {
      const byId = { ...state.byId, [id]: updatedMovement };
      const byAccount = buildByAccountIndex(
        state.allIds.map((mId) => (mId === id ? updatedMovement : byId[mId])).filter(Boolean),
      );

      return {
        byId,
        byAccount,
      };
    });
  },
}));

export function validateMovement(
  data: { [k: string]: FormDataEntryValue },
  typeId: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (
    typeof data.amount !== "string" ||
    Number.isNaN(Number(data.amount)) ||
    Number(data.amount) <= 0
  ) {
    errors.push("El monto debe ser un número mayor a 0");
  }

  if (typeof data.accountId !== "string" || data.accountId.trim() === "") {
    errors.push("La cuenta es requerida");
  }

  if (
    typeof data.currency !== "string" ||
    data.currency.trim() === "" ||
    Number(data.currency) <= 0
  ) {
    errors.push("La moneda es requerida");
  }

  if (typeof data.categoryId !== "string" || data.categoryId.trim() === "") {
    errors.push("La categoría es requerida");
  }

  if (typeof data.date !== "string" || data.date.trim() === "") {
    errors.push("La fecha es requerida");
  }

  if (typeId === MOVEMENT_TYPES.TRANSFER) {
    if (typeof data.toAccountId !== "string" || data.toAccountId.trim() === "") {
      errors.push("La cuenta destino es requerida");
    }

    if (data.accountId === data.toAccountId) {
      errors.push("La cuenta origen y destino no pueden ser la misma");
    }
  }

  if (typeId === MOVEMENT_TYPES.EXPENSE && data.installments) {
    const installments = Number(data.installments);
    if (!Number.isNaN(installments) && (installments < 1 || installments > 48)) {
      errors.push("Las mensualidades deben ser entre 1 y 48");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createMovementFromData(
  data: { [k: string]: FormDataEntryValue },
  typeId: number,
  isCredit: boolean,
): Movement {
  const dateValue = String(data.date);
  const timeValue = data.time ? String(data.time) : "00:00";
  const timestamp = new Date(`${dateValue}T${timeValue}`).getTime();

  if (isCredit && !data.installments && Number(data.installments) <= 0) data.installments = "1";

  return {
    id: 0,
    typeId,
    accountId: Number(data.accountId),
    toAccountId: typeId === MOVEMENT_TYPES.TRANSFER ? Number(data.toAccountId) : undefined,
    categoryId: Number(data.categoryId),
    currencyId: Number(data.currency),
    originalAmount: Number(data.amount),
    accountAmount: Number(data.accountAmount ?? data.amount),
    installments:
      typeId === MOVEMENT_TYPES.EXPENSE && data.installments && Number(data.installments) > 0
        ? Number(data.installments)
        : undefined,
    timestamp,
    description: data.description ? String(data.description) : undefined,
    planningId:
      typeId === MOVEMENT_TYPES.TRANSFER
        ? undefined
        : data.planningId
          ? Number(data.planningId)
          : undefined,
  };
}

export interface DateGroup {
  dayTimestamp: number;
  ids: number[];
}

export function groupMovementsByDate(ids: number[], byId: Record<number, Movement>): DateGroup[] {
  const groupsMap = new Map<number, number[]>();
  const orderedDays: number[] = [];

  for (const id of ids) {
    const movement = byId[id];
    if (!movement) continue;

    const date = new Date(movement.timestamp);
    date.setHours(0, 0, 0, 0);
    const dayTimestamp = date.getTime();

    if (!groupsMap.has(dayTimestamp)) {
      groupsMap.set(dayTimestamp, []);
      orderedDays.push(dayTimestamp);
    }
    groupsMap.get(dayTimestamp)!.push(id);
  }

  return orderedDays.map((dayTimestamp) => ({
    dayTimestamp,
    ids: groupsMap.get(dayTimestamp)!,
  }));
}
