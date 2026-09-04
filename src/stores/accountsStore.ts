import { createStore } from "zustand/vanilla";

import { logger } from "@/lib/logger";
import { accountsCommands } from "@/services/tauri/accounts";
import { statisticsStore } from "@/stores/statisticsStore";

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

    set((state) => ({
      accounts: [...state.accounts, newAccount],
      types: state.types,
    }));

    return newAccount;
  },
  remove: async (id: number) => {
    await accountsCommands.remove(id);

    return set((state) => ({
      accounts: state.accounts.filter((account) => account.id !== id),
      types: state.types,
    }));
  },
  activate: async (id: number) => {
    const updatedAccount = await accountsCommands.activate(id);
    set((state) => ({
      ...state,
      accounts: state.accounts.map((account) =>
        account.id === updatedAccount.id ? updatedAccount : account,
      ),
    }));
  },
  deactivate: async (id: number) => {
    const updatedAccount = await accountsCommands.deactivate(id);
    set((state) => ({
      ...state,
      accounts: state.accounts.map((account) =>
        account.id === updatedAccount.id ? updatedAccount : account,
      ),
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

export {
  createAccountFromData,
  validateAccountForm as validate,
} from "@/lib/forms/account";
