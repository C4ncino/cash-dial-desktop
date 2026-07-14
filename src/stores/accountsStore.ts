import { invoke } from "@tauri-apps/api/core";
import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { ACCOUNT_FUNCTIONS, ACCOUNT_TYPES } from "@/types/enums";

export const accountsStore = createStore<AccountsStore & Actions<Account>>((set, get) => ({
  accounts: [] as Account[],
  types: [] as AccountType[],
  populate: async () => {
    const types = (await invoke("get_account_types")) as AccountType[];
    const accounts = (await invoke("get_accounts")) as Account[];

    logger.debug("Accounts:", accounts);
    logger.debug("Account types:", types);

    return set({
      accounts,
      types,
    });
  },
  add: async (account: Account) => {
    const newAccount = (await invoke(ACCOUNT_FUNCTIONS.add, {
      name: account.name,
      balance: account.balance,
      typeId: account.type.id,
      currencyId: account.currencyId,
      creditInfo: account.creditInfo,
    })) as Account;

    logger.info("Account created", newAccount);

    return set((state) => ({
      accounts: [...state.accounts, newAccount],
      types: state.types,
    }));
  },
  remove: async (id: number) => {
    await invoke(ACCOUNT_FUNCTIONS.remove, { id });

    return set((state) => ({
      accounts: state.accounts.filter((account) => account.id !== id),
      types: state.types,
    }));
  },
  getById: (id: number) => get().accounts.find((account) => account.id === id),
  update: async (id: number, account: Account) => {
    const updatedAccount = (await invoke(ACCOUNT_FUNCTIONS.update, {
      id,
      name: account.name,
      balance: account.balance,
      typeId: account.type.id,
      currencyId: account.currencyId,
      creditInfo: account.creditInfo,
    })) as Account;

    return set((state) => ({
      accounts: state.accounts.map((acc) => (acc.id === id ? updatedAccount : acc)),
      types: state.types,
    }));
  },
  updateBalance: async (accountId: number, toAccountId?: number) => {
    const balance1 = (await invoke(ACCOUNT_FUNCTIONS.getBalance, { id: accountId })) as number;
    let balance2: number | undefined;
    if (toAccountId !== undefined) {
      balance2 = (await invoke(ACCOUNT_FUNCTIONS.getBalance, { id: toAccountId })) as number;
    }

    set((state) => {
      const updatedAccounts = state.accounts.map((acc) => {
        if (acc.id === accountId) {
          return { ...acc, balance: balance1 };
        }
        if (toAccountId !== undefined && acc.id === toAccountId) {
          return { ...acc, balance: balance2 as number };
        }
        return acc;
      });
      return {
        ...state,
        accounts: updatedAccounts,
      };
    });

    if (balance2 !== undefined) {
      return [balance1, balance2];
    }
    return balance1;
  },
}));

export function validate(data: { [k: string]: FormDataEntryValue }): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof data.name !== "string" || data.name.trim() === "") {
    errors.push("El nombre es requerido");
  }

  if (typeof data.name === "string" && data.name.trim().length > 25) {
    errors.push("El nombre debe tener máximo 25 caracteres");
  }

  if (typeof data.balance !== "string" || Number.isNaN(Number(data.balance))) {
    errors.push("El saldo debe ser un número válido");
  }

  if (typeof data.type !== "string" || data.type.trim() === "" || Number.isNaN(Number(data.type))) {
    errors.push("El tipo de cuenta es requerido");
  }

  if (Number(data.type) === ACCOUNT_TYPES.CREDIT) {
    if (typeof data.creditLimit !== "string" && Number.isNaN(Number(data.creditLimit))) {
      errors.push("El límite de crédito es requerido");
    }

    if (Number(data.creditLimit) <= 0) {
      errors.push("El límite de crédito debe ser mayor a 0");
    }

    if (Number(data.balance) < 0) {
      errors.push("El saldo usado debe ser mayor o igual a 0");
    }

    if (typeof data.cutoffDay !== "string" && Number.isNaN(Number(data.cutoffDay))) {
      errors.push("El día de corte es requerido");
    }

    if (typeof data.daysToPay !== "string" && Number.isNaN(Number(data.daysToPay))) {
      errors.push("El día de pago es requerido");
    }

    if (Number(data.cutoffDay) <= 0 && Number(data.cutoffDay) > 31) {
      errors.push("El día de corte debe ser un número entre 1 y 31");
    }

    if (Number(data.daysToPay) <= 0 && Number(data.daysToPay) > 30) {
      errors.push("El día de pago debe ser un número entre 1 y 30");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createAccountFromData(
  data: { [k: string]: FormDataEntryValue },
  type: AccountType,
): Account {
  const account = {
    id: 0,
    name: String(data.name),
    balance: Number(data.balance),
    type: type,
    currencyId: Number(data.currency),
    creditInfo:
      data.type === String(ACCOUNT_TYPES.CREDIT)
        ? {
            creditLimit: Number(data.creditLimit),
            cutoffDay: Number(data.cutoffDay),
            daysToPay: Number(data.daysToPay),
          }
        : undefined,
    isActive: true,
  };

  return account;
}
