import { invoke } from "@tauri-apps/api/core";
import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { MOVEMENT_FUNCTIONS, MOVEMENT_TYPES } from "@/types/enums";

export const movementsStore = createStore<MovementsStore & Actions<Movement>>((set, get) => ({
  byId: {} as Record<number, Movement>,
  allIds: [] as number[],
  byAccount: {} as Record<number, number[]>,
  types: [] as MovementType[],

  populate: async () => {
    const types = (await invoke(MOVEMENT_FUNCTIONS.getTypes)) as MovementType[];
    const movements = (await invoke(MOVEMENT_FUNCTIONS.get)) as Movement[];

    logger.debug("Movements:", movements);
    logger.debug("Movement types:", types);

    const byId: Record<number, Movement> = {};
    const allIds: number[] = [];
    const byAccount: Record<number, number[]> = {};

    for (const m of movements) {
      if (m.installments) {
        m.installmentsData = (await invoke(MOVEMENT_FUNCTIONS.getInstallments, {
          movementId: m.id,
        })) as MovementInstallment[];
      }

      byId[m.id] = m;
      allIds.push(m.id);

      if (!byAccount[m.accountId]) {
        byAccount[m.accountId] = [];
      }
      byAccount[m.accountId].push(m.id);

      if (m.toAccountId) {
        if (!byAccount[m.toAccountId]) {
          byAccount[m.toAccountId] = [];
        }
        byAccount[m.toAccountId].push(m.id);
      }
    }

    return set({
      byId,
      allIds,
      byAccount,
      types,
    });
  },

  add: async (movement: Movement) => {
    const newMovement = (await invoke(MOVEMENT_FUNCTIONS.add, {
      typeId: movement.typeId,
      accountId: movement.accountId,
      toAccountId: movement.toAccountId,
      categoryId: movement.categoryId,
      currencyId: movement.currencyId,
      originalAmount: movement.originalAmount,
      accountAmount: movement.accountAmount,
      installments: movement.installments,
      timestamp: movement.timestamp,
      description: movement.description,
    })) as Movement;

    if (newMovement.installments) {
      newMovement.installmentsData = (await invoke(MOVEMENT_FUNCTIONS.getInstallments, {
        movementId: newMovement.id,
      })) as MovementInstallment[];
    }

    logger.info("Movement created", newMovement);

    return set((state) => {
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
  },

  remove: async (id: number) => {
    await invoke(MOVEMENT_FUNCTIONS.remove, { id });

    return set((state) => {
      const byId = { ...state.byId };
      delete byId[id];

      const allIds = state.allIds.filter((mId) => mId !== id);

      const byAccount: Record<number, number[]> = {};
      for (const mId of allIds) {
        const m = byId[mId];
        if (!m) continue;

        if (!byAccount[m.accountId]) {
          byAccount[m.accountId] = [];
        }
        byAccount[m.accountId].push(m.id);

        if (m.toAccountId) {
          if (!byAccount[m.toAccountId]) {
            byAccount[m.toAccountId] = [];
          }
          byAccount[m.toAccountId].push(m.id);
        }
      }

      return {
        byId,
        allIds,
        byAccount,
      };
    });
  },

  getById: (id: number) => get().byId[id],

  update: async (id: number, movement: Movement) => {
    const updatedMovement = (await invoke(MOVEMENT_FUNCTIONS.update, {
      id,
      typeId: movement.typeId,
      accountId: movement.accountId,
      toAccountId: movement.toAccountId,
      categoryId: movement.categoryId,
      currencyId: movement.currencyId,
      originalAmount: movement.originalAmount,
      accountAmount: movement.accountAmount,
      installments: movement.installments,
      timestamp: movement.timestamp,
      description: movement.description,
    })) as Movement;

    if (updatedMovement.installments) {
      updatedMovement.installmentsData = (await invoke(MOVEMENT_FUNCTIONS.getInstallments, {
        movementId: updatedMovement.id,
      })) as MovementInstallment[];
    }

    return set((state) => {
      const byId = { ...state.byId, [id]: updatedMovement };

      const byAccount: Record<number, number[]> = {};
      for (const mId of state.allIds) {
        const m = mId === id ? updatedMovement : state.byId[mId];
        if (!m) continue;

        if (!byAccount[m.accountId]) {
          byAccount[m.accountId] = [];
        }
        byAccount[m.accountId].push(m.id);

        if (m.toAccountId) {
          if (!byAccount[m.toAccountId]) {
            byAccount[m.toAccountId] = [];
          }
          byAccount[m.toAccountId].push(m.id);
        }
      }

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
    accountAmount: Number(data.amount), // TODO: Currency conversion logic if currencies differ
    installments:
      typeId === MOVEMENT_TYPES.EXPENSE && data.installments && Number(data.installments) > 0
        ? Number(data.installments)
        : undefined,
    timestamp,
    description: data.description ? String(data.description) : undefined,
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
