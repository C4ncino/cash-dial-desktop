import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { accountsCommands } from "@/services/tauri/accounts";
import { statisticsStore } from "@/stores/statisticsStore";
import { ACCOUNT_TYPES } from "@/types/enums";

export const accountsStore = createStore<AccountsStore & Actions<Account>>((set, get) => ({
  accounts: [] as Account[],
  types: [] as AccountType[],
  populate: async () => {
    const types = await accountsCommands.getTypes();
    const accounts = await accountsCommands.getAll();

    logger.debug("Accounts:", accounts);
    logger.debug("Account types:", types);

    return set({
      accounts,
      types,
    });
  },
  add: async (account: Account) => {
    const newAccount = await accountsCommands.add({
      name: account.name,
      balance: account.balance,
      typeId: account.type.id,
      currencyId: account.currencyId,
      creditInfo: account.creditInfo,
    });

    logger.info("Account created", newAccount);

    return set((state) => ({
      accounts: [...state.accounts, newAccount],
      types: state.types,
    }));
  },
  remove: async (id: number) => {
    await accountsCommands.remove(id);

    return set((state) => ({
      accounts: state.accounts.filter((account) => account.id !== id),
      types: state.types,
    }));
  },
  getById: (id: number) => get().accounts.find((account) => account.id === id),
  update: async (id: number, account: Account) => {
    const updatedAccount = await accountsCommands.update(id, {
      name: account.name,
      balance: account.balance,
      typeId: account.type.id,
      currencyId: account.currencyId,
      creditInfo: account.creditInfo,
    });

    return set((state) => ({
      accounts: state.accounts.map((acc) => (acc.id === id ? updatedAccount : acc)),
      types: state.types,
    }));
  },
  updateBalance: async (accountId: number, toAccountId?: number) => {
    const balance1 = await accountsCommands.getBalance(accountId);
    let balance2: number | undefined;
    if (toAccountId !== undefined) {
      balance2 = await accountsCommands.getBalance(toAccountId);
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
  getNextPayment: async (accountId: number) => {
    try {
      const response = await accountsCommands.getNextPayment(accountId);
      return response;
    } catch (error) {
      logger.error("Failed to get next payment", error);
      throw error;
    }
  },
  payCreditCard: async (
    creditAccountId: number,
    payments: CreditCardPaymentRequest[],
    installmentIds: number[],
  ) => {
    try {
      const result = await accountsCommands.payCreditCard(
        creditAccountId,
        payments,
        installmentIds,
      );
      await get().populate();
      statisticsStore.getState().invalidate();
      return result;
    } catch (error) {
      logger.error("Failed to pay credit card", error);
      throw error;
    }
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

  if (typeof data.balance !== "string" || !Number.isFinite(Number(data.balance))) {
    errors.push("El saldo debe ser un número válido");
  }

  if (typeof data.type !== "string" || data.type.trim() === "" || Number.isNaN(Number(data.type))) {
    errors.push("El tipo de cuenta es requerido");
  }

  if (Number(data.type) === ACCOUNT_TYPES.CREDIT) {
    if (
      typeof data.creditLimit !== "string" ||
      data.creditLimit.trim() === "" ||
      !Number.isFinite(Number(data.creditLimit))
    ) {
      errors.push("El límite de crédito es requerido");
    }

    if (Number(data.creditLimit) <= 0) {
      errors.push("El límite de crédito debe ser mayor a 0");
    }

    if (Number(data.balance) < 0) {
      errors.push("El saldo usado debe ser mayor o igual a 0");
    }

    if (
      typeof data.cutoffDay !== "string" ||
      data.cutoffDay.trim() === "" ||
      !Number.isInteger(Number(data.cutoffDay))
    ) {
      errors.push("El día de corte es requerido");
    }

    if (
      typeof data.daysToPay !== "string" ||
      data.daysToPay.trim() === "" ||
      !Number.isInteger(Number(data.daysToPay))
    ) {
      errors.push("El día de pago es requerido");
    }

    if (Number(data.cutoffDay) <= 0 || Number(data.cutoffDay) > 31) {
      errors.push("El día de corte debe ser un número entre 1 y 31");
    }

    if (Number(data.daysToPay) <= 0 || Number(data.daysToPay) > 30) {
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
